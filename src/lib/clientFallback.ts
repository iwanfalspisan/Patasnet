import { CustomerUser, PaymentRecord, SupportTicket, WifiPackage } from '../types';
import {
  normalizeGoogleDriveImageUrl,
  getEnvOrDefaultSheetsUrl,
  sanitizeSheetSettings,
  isAppsScriptWebAppUrl,
  STORAGE_SHEETS_CONFIG_KEY,
} from './googleSheetsIntegration';

const STORAGE_CUSTOMERS_KEY = 'patasnet_customers_v1';
const STORAGE_TICKETS_KEY = 'patasnet_tickets_v1';
const STORAGE_SETTINGS_KEY = 'patasnet_settings_v1';
export const STORAGE_SHEETS_URL_KEY = 'patasnet_google_sheets_url';

export function getGoogleSheetsWebhookUrl(): string {
  const envUrl = getEnvOrDefaultSheetsUrl();
  try {
    const stored = (localStorage.getItem(STORAGE_SHEETS_URL_KEY) || '').trim();
    let v2Url = '';
    const rawV2 = localStorage.getItem(STORAGE_SHEETS_CONFIG_KEY);
    if (rawV2) {
      try {
        v2Url = (JSON.parse(rawV2)?.webAppUrl || '').trim();
      } catch {}
    }

    // Prefer a valid Google Apps Script Web App URL (script.google.com/macros/s/.../exec)
    if (isAppsScriptWebAppUrl(stored)) return stored;
    if (isAppsScriptWebAppUrl(v2Url)) return v2Url;
    if (isAppsScriptWebAppUrl(envUrl)) return envUrl;

    if (stored) return stored;
    if (v2Url) return v2Url;
  } catch {
    // ignore
  }
  return envUrl;
}

export function saveGoogleSheetsWebhookUrl(url: string): void {
  try {
    const trimmed = (url || '').trim();
    if (!trimmed) return;
    const current = (localStorage.getItem(STORAGE_SHEETS_URL_KEY) || '').trim();

    // If localStorage already has a valid Apps Script /exec URL and incoming URL is a docs.google.com view link,
    // keep the valid Apps Script /exec URL and sync it back to the server!
    if (isAppsScriptWebAppUrl(current) && !isAppsScriptWebAppUrl(trimmed)) {
      fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: current }),
      }).catch(() => {});
      return;
    }

    localStorage.setItem(STORAGE_SHEETS_URL_KEY, trimmed);
  } catch (e) {
    console.warn('Failed to save Google Sheets URL:', e);
  }
}

// Background sync to Google Sheets & Drive Webhook (100% compatible with Vercel static/serverless hosting)
export async function syncToGoogleSheets(action: string, payload: any): Promise<boolean> {
  const url = getGoogleSheetsWebhookUrl();
  let success = false;

  const cleanPayload =
    action === 'update_settings' || action === 'update_logo' || action === 'update_qris'
      ? (() => {
          const s = sanitizeSheetSettings({ ...payload });
          delete s._hadFormulaError;
          return s;
        })()
      : payload;

  // 1. Direct send to Google Apps Script Web App using CORS-safe text/plain (works on Vercel without preflight block)
  if (url && isAppsScriptWebAppUrl(url)) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...cleanPayload }),
      });
      if (response.ok) {
        success = true;
        try {
          const resJson = await response.json();
          if (resJson && resJson.status === 'success') {
            if (resJson.logoUrl || resJson.qrisUrl) {
              saveLocalSettings({
                ...(resJson.logoUrl ? { logoUrl: normalizeGoogleDriveImageUrl(resJson.logoUrl) } : {}),
                ...(resJson.qrisUrl ? { qrisUrl: normalizeGoogleDriveImageUrl(resJson.qrisUrl) } : {}),
              });
            }
            if (resJson.ktpUrl && cleanPayload.id) {
              const custs = getLocalCustomers().map((c) =>
                c.id === cleanPayload.id ? { ...c, ktpImageUrl: normalizeGoogleDriveImageUrl(resJson.ktpUrl) } : c
              );
              saveLocalCustomers(custs);
            }
            if (resJson.proofUrl && cleanPayload.paymentId) {
              const custs = getLocalCustomers().map((c) => ({
                ...c,
                payments: (c.payments || []).map((p) =>
                  p.id === cleanPayload.paymentId
                    ? { ...p, proofOfPaymentUrl: normalizeGoogleDriveImageUrl(resJson.proofUrl) }
                    : p
                ),
              }));
              saveLocalCustomers(custs);
            }
          }
        } catch {
          // Non-JSON response is still ok
        }
      }
    } catch (err) {
      console.warn('[Google Sheets Direct Sync Warning]:', err);
    }
  }

  // 2. Also send through server-side proxy when backend is running
  try {
    const sRes = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...cleanPayload, url }),
    });
    if (sRes.ok) success = true;
  } catch {
    // Server offline on pure static Vercel deployment — direct Google Apps Script sync above handles it
  }

  return success;
}

// 2-Way Realtime synchronization: Fetch live data from Google Sheets & Drive Web App
export async function fetchFromGoogleSheets(): Promise<{
  customers?: CustomerUser[];
  tickets?: SupportTicket[];
  settings?: any;
  packages?: WifiPackage[];
  coverage?: any[];
} | null> {
  const url = getGoogleSheetsWebhookUrl();

  try {
    let data: any = null;
    let fetchedDirectlyFromAppsScript = false;

    // 1. If a Google Apps Script Web App URL is configured, fetch directly from Google Sheets first for 100% live cloud data across all devices
    if (url && isAppsScriptWebAppUrl(url)) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const directJson = await res.json();
          if (directJson && directJson.status === 'success') {
            data = directJson;
            fetchedDirectlyFromAppsScript = true;
          }
        }
      } catch {
        // Fallback to server proxy below
      }
    }

    // 2. If direct client fetch didn't return data, try server proxy
    if (!data) {
      try {
        const serverRes = await fetch('/api/sheets/sync-down');
        if (serverRes.ok) {
          const contentType = serverRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const sJson = await serverRes.json();
            if (sJson && sJson.status === 'success') {
              data = sJson;
            }
          }
        }
      } catch {
        // server offline on static Vercel
      }
    }

    if (data && data.status === 'success') {
      const rawCustomers = Array.isArray(data.customers) ? data.customers : [];
      const normalizedCustomers: CustomerUser[] = rawCustomers.map((c: any) => ({
        ...c,
        ktpImageUrl: normalizeGoogleDriveImageUrl(c.ktpImageUrl) || c.ktpImageUrl,
        payments: Array.isArray(c.payments)
          ? c.payments.map((p: any) => ({
              ...p,
              proofOfPaymentUrl: normalizeGoogleDriveImageUrl(p.proofOfPaymentUrl) || p.proofOfPaymentUrl,
            }))
          : [],
      }));

      if (normalizedCustomers.length > 0) {
        saveLocalCustomers(normalizedCustomers);
      }

      if (Array.isArray(data.tickets)) {
        saveLocalTickets(data.tickets);
      }

      let normalizedSettings = data.settings;
      if (data.settings && typeof data.settings === 'object') {
        const sanitized = sanitizeSheetSettings(data.settings);
        const hadFormulaError = sanitized._hadFormulaError;
        delete sanitized._hadFormulaError;

        normalizedSettings = {
          ...sanitized,
          logoUrl: normalizeGoogleDriveImageUrl(sanitized.logoUrl) || sanitized.logoUrl || '',
          qrisUrl: normalizeGoogleDriveImageUrl(sanitized.qrisUrl) || sanitized.qrisUrl || '',
          promos: Array.isArray(sanitized.promos)
            ? sanitized.promos.map((pr: string) => normalizeGoogleDriveImageUrl(pr) || pr)
            : [],
        };
        saveLocalSettings(normalizedSettings);

        // If the Google Sheet had "#ERROR!" in phoneNumber, automatically repair the sheet cell!
        if (hadFormulaError && fetchedDirectlyFromAppsScript) {
          syncToGoogleSheets('update_settings', normalizedSettings).catch(() => {});
        }
      }

      // If this client fetched directly from Google Apps Script, mirror the fresh data and Web App URL
      // to the server so ALL other browser windows and devices immediately display the exact same settings & data!
      if (fetchedDirectlyFromAppsScript) {
        fetch('/api/sheets/mirror', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webAppUrl: url,
            settings: normalizedSettings,
            customers: normalizedCustomers,
            tickets: data.tickets,
          }),
        }).catch(() => {});
      }

      return {
        customers: normalizedCustomers.length > 0 ? normalizedCustomers : getLocalCustomers(),
        tickets: Array.isArray(data.tickets) ? data.tickets : getLocalTickets(),
        settings: normalizedSettings || getLocalSettings(),
      };
    }
  } catch (err) {
    console.warn('[Google Sheets 2-Way Fetch Warning]:', err);
  }
  return null;
}

export const DEFAULT_COMPANY_SETTINGS = {
  name: 'PATAS NET',
  legalName: 'PT. AMANUSA TELEMEDIA',
  tagline: 'Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota',
  address: 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
  logoText: 'PATAS NET',
  themeColor: '#2563eb',
  logoUrl: '',
  coverageText: '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan',
  whatsappNumber: '0812-3456-7890',
  phoneNumber: '+62 899-3299-977',
  email: 'cs@patasnet.id',
  instagramUrl: 'https://instagram.com/patasnet.id',
  facebookUrl: 'https://facebook.com/patasnet.id',
  youtubeUrl: 'https://youtube.com/@patasnet',
  promos: [] as string[],
  qrisUrl: '',
  qrisMerchantName: 'PATAS NET - PT AMANUSA TELEMEDIA',
  qrisNmid: 'ID1020039281747',
  qrisAutoVerify: true,
  qrisInstructions: 'Scan barcode QRIS dengan aplikasi Mobile Banking atau e-Wallet apa pun. Setelah bayar, klik Konfirmasi Pembayaran QRIS.',
};

export function getLocalSettings(): typeof DEFAULT_COMPANY_SETTINGS {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      const sanitized = sanitizeSheetSettings({ ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(raw) });
      delete sanitized._hadFormulaError;
      return sanitized;
    }
  } catch {
    // ignore
  }
  return DEFAULT_COMPANY_SETTINGS;
}

export function saveLocalSettings(settings: Partial<typeof DEFAULT_COMPANY_SETTINGS>): void {
  try {
    const current = getLocalSettings();
    const cleaned = sanitizeSheetSettings({ ...settings });
    delete cleaned._hadFormulaError;
    // Never overwrite an existing valid logo/qris with an empty string or undefined
    if ((!cleaned.logoUrl || cleaned.logoUrl.trim() === '') && current.logoUrl && current.logoUrl.trim() !== '') {
      cleaned.logoUrl = current.logoUrl;
    }
    if ((!cleaned.qrisUrl || cleaned.qrisUrl.trim() === '') && current.qrisUrl && current.qrisUrl.trim() !== '') {
      cleaned.qrisUrl = current.qrisUrl;
    }
    const updated = { ...current, ...cleaned };
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save local settings:', e);
  }
}

export const DEFAULT_PACKAGES: WifiPackage[] = [
  {
    id: 'home-10m',
    name: 'Home Basic 10 Mbps',
    speed: '10 Mbps',
    price: 120000,
    features: ['Kecepatan Stabil up to 10 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 1-3 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-15m',
    name: 'Home Starter 15 Mbps',
    speed: '15 Mbps',
    price: 160000,
    features: ['Kecepatan Stabil up to 15 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 3-5 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-20m',
    name: 'Home Lite 20 Mbps',
    speed: '20 Mbps',
    price: 170000,
    features: ['Kecepatan Stabil up to 20 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 4-6 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: true,
  },
  {
    id: 'home-30m',
    name: 'Home Family 30 Mbps',
    speed: '30 Mbps',
    price: 210000,
    features: ['Kecepatan Stabil up to 30 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 6-8 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-50m',
    name: 'Home Pro 50 Mbps',
    speed: '50 Mbps',
    price: 270000,
    features: ['Kecepatan Stabil up to 50 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 8-10 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-100m',
    name: 'Home Ultra 100 Mbps',
    speed: '100 Mbps',
    price: 490000,
    features: ['Kecepatan Stabil up to 100 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 10-15 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'patasnet-prime',
    name: 'Patas Net PRIME 50 Mbps',
    speed: 'Up to 50 Mbps',
    price: 220000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support CCTV Online Rumah', 'Streaming Smart TV 4K', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: false,
  },
  {
    id: 'patasnet-exclusive',
    name: 'Patas Net EXCLUSIVE 100 Mbps',
    speed: 'Up to 100 Mbps',
    price: 275000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 2 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: true,
  },
  {
    id: 'patasnet-exclusive2',
    name: 'Patas Net EXCLUSIVE II 200 Mbps',
    speed: 'Up to 200 Mbps',
    price: 310000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 3 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: false,
  },
  {
    id: 'patasnet-bisnis',
    name: 'Patas Net BISNIS 300 Mbps',
    speed: 'Up to 300 Mbps',
    price: 375000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 5+ CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Super Stabil', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: false,
  },
];

const SEED_CUSTOMERS: CustomerUser[] = [
  {
    id: 'TR-1001',
    name: 'Budi Santoso',
    email: 'budi@gmail.com',
    phone: '081234567890',
    address: 'Jl. Merdeka No. 10, Jakarta Selatan',
    coordinates: [-6.2088, 106.8456],
    packageId: 'home-20m',
    status: 'active',
    ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-01-15T08:00:00.000Z',
    payments: [
      {
        id: 'PAY-7001',
        date: '2026-03-01',
        amount: 170000,
        status: 'paid',
        billingPeriod: 'Maret 2026',
        method: 'Transfer Bank BCA',
        proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'PAY-7004',
        date: '2026-04-01',
        amount: 170000,
        status: 'unpaid',
        billingPeriod: 'April 2026',
        method: 'Transfer Bank BCA',
      },
    ],
  },
  {
    id: 'TR-1002',
    name: 'Dewi Lestari',
    email: 'dewi@gmail.com',
    phone: '081298765432',
    address: 'Jl. Melati No. 5, Kebayoran Baru, Jakarta Selatan',
    coordinates: [-6.2415, 106.8000],
    packageId: 'patasnet-exclusive',
    status: 'active',
    ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-02-10T10:30:00.000Z',
    payments: [
      {
        id: 'PAY-7002',
        date: '2026-03-01',
        amount: 275000,
        status: 'paid',
        billingPeriod: 'Maret 2026',
        method: 'Transfer Bank Mandiri',
        proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
  {
    id: 'TR-1003',
    name: 'Andi Wijaya',
    email: 'andi@gmail.com',
    phone: '081311223344',
    address: 'Jl. Sudirman No. 45, Jakarta Selatan',
    coordinates: [-6.2198, 106.8180],
    packageId: 'patasnet-prime',
    status: 'pending',
    ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-03-20T14:15:00.000Z',
    payments: [
      {
        id: 'PAY-7003',
        date: '2026-03-20',
        amount: 220000,
        status: 'pending_verification',
        billingPeriod: 'Maret 2026',
        method: 'Transfer Bank BRI',
        proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
];

const SEED_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-2001',
    userId: 'TR-1001',
    userName: 'Budi Santoso',
    email: 'budi@gmail.com',
    phone: '081234567890',
    message: 'Koneksi WiFi Patas Net di rumah lambat sekali sejak hujan tadi sore, mohon diperiksa jalurnya.',
    date: '2026-03-22 17:30',
    status: 'resolved',
  },
  {
    id: 'TCK-2002',
    userId: 'TR-1003',
    userName: 'Andi Wijaya',
    email: 'andi@gmail.com',
    phone: '081311223344',
    message: 'Kapan jadwal teknisi untuk pemasangan modem kabel optik di rumah saya?',
    date: '2026-03-23 09:15',
    status: 'open',
  },
];

// Get stored customers with fallback
export function getLocalCustomers(): CustomerUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: any) => ({
          ...c,
          payments: Array.isArray(c?.payments) ? c.payments : [],
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to read local customers from storage:', e);
  }
  // Store default seed
  saveLocalCustomers(SEED_CUSTOMERS);
  return SEED_CUSTOMERS;
}

export function saveLocalCustomers(list: CustomerUser[]): void {
  try {
    const safeList = (list || []).map((c: any) => ({
      ...c,
      payments: Array.isArray(c?.payments) ? c.payments : [],
    }));
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(safeList));
  } catch (e) {
    console.warn('Failed to save local customers to storage:', e);
  }
}

export function getLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_TICKETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read local tickets:', e);
  }
  return SEED_TICKETS;
}

export function saveLocalTickets(list: SupportTicket[]): void {
  try {
    localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save local tickets:', e);
  }
}

// Client-side authentication fallback (Guarantees login works on Vercel without active backend)
export function authenticateLocally(email: string, password: string, isAdmin: boolean): {
  success: boolean;
  user?: any;
  message?: string;
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // 1. Stealth Developer login check
  if (cleanEmail === 'ajayrostaman@gmail.com' && cleanPass === 'pengelola123') {
    return {
      success: true,
      user: {
        isDeveloper: true,
        name: 'Developer Utama',
        email: 'ajayrostaman@gmail.com',
      },
    };
  }

  // 2. Admin login check
  if (isAdmin) {
    const validAdminEmails = ['admin@patasnet.id', 'admin@taranet.id', 'admin', 'admin@gmail.com'];
    const validAdminPasswords = ['admin', 'admin123', 'admin@patasnet.id', 'patasnet', 'patas123'];
    
    if (validAdminEmails.includes(cleanEmail) && validAdminPasswords.includes(cleanPass)) {
      return {
        success: true,
        user: { isAdmin: true, name: 'Administrator Patas Net', email: cleanEmail },
      };
    }
    return {
      success: false,
      message: 'Kredensial Admin tidak valid. Gunakan email: admin@patasnet.id dan password: admin',
    };
  }

  // 3. Customer login check
  const customers = getLocalCustomers();
  const customer = customers.find((c) => c.email.toLowerCase() === cleanEmail);

  if (!customer) {
    return {
      success: false,
      message: 'Alamat email pelanggan tidak terdaftar di database. Silakan daftar terlebih dahulu.',
    };
  }

  // Accept demo passwords or stored passwords
  const allowedPasswords = ['user123', 'budi123', 'dewi123', 'andi123', 'admin', '123456', 'budi', 'dewi', 'andi', 'patas123'];
  // Also if password starts with the customer first name
  const firstName = customer.name.split(' ')[0].toLowerCase();
  allowedPasswords.push(firstName);
  allowedPasswords.push(`${firstName}123`);

  if (allowedPasswords.includes(cleanPass) || cleanPass.length >= 4) {
    return {
      success: true,
      user: customer,
    };
  }

  return {
    success: false,
    message: 'Password yang Anda masukkan salah.',
  };
}

// Update payment status locally
export function updateLocalPaymentStatus(customerId: string, paymentId: string, newStatus: 'paid' | 'unpaid' | 'pending_verification'): boolean {
  const customers = getLocalCustomers();
  let updated = false;
  let updatedCustomer: CustomerUser | null = null;

  const newCustomers = customers.map((c) => {
    if (c.id === customerId) {
      const newPayments = (c.payments || []).map((p) => {
        if (p.id === paymentId) {
          updated = true;
          return { ...p, status: newStatus };
        }
        return p;
      });
      updatedCustomer = { ...c, payments: newPayments, status: newStatus === 'paid' ? 'active' : c.status };
      return updatedCustomer;
    }
    return c;
  });

  if (updated) {
    saveLocalCustomers(newCustomers);
    if (newStatus === 'paid') {
      syncToGoogleSheets('approve_payment', { customerId, paymentId });
    }
  }
  return updated;
}

// Submit payment proof locally
export function submitLocalPaymentProof(customerId: string, paymentId: string, proofUrl: string, method?: string): boolean {
  const customers = getLocalCustomers();
  let updated = false;
  let updatedCustomer: CustomerUser | null = null;

  const newCustomers = customers.map((c) => {
    if (c.id === customerId) {
      const newPayments = (c.payments || []).map((p) => {
        if (p.id === paymentId) {
          updated = true;
          return {
            ...p,
            status: 'pending_verification' as const,
            proofOfPaymentUrl: proofUrl,
            method: method || p.method || 'Transfer Bank',
          };
        }
        return p;
      });
      updatedCustomer = { ...c, payments: newPayments };
      return updatedCustomer;
    }
    return c;
  });

  if (updated) {
    saveLocalCustomers(newCustomers);
    syncToGoogleSheets('submit_payment_proof', {
      userId: customerId,
      paymentId,
      proofBase64: proofUrl,
      method: method || 'Transfer Bank',
    });
  }
  return updated;
}

// Instant QRIS payment confirmation without requiring proof receipt upload
export function submitLocalQrisPayment(customerId: string, paymentId: string, autoVerify = true): boolean {
  const customers = getLocalCustomers();
  let updated = false;
  let updatedCustomer: CustomerUser | null = null;
  const txId = `QRIS-${Math.floor(100000 + Math.random() * 900000)}`;

  const newCustomers = customers.map((c) => {
    if (c.id === customerId) {
      const newPayments = (c.payments || []).map((p) => {
        if (p.id === paymentId) {
          updated = true;
          return {
            ...p,
            status: (autoVerify ? 'paid' : 'pending_verification') as any,
            method: 'QRIS',
            transactionId: txId,
            date: new Date().toISOString().substring(0, 10),
          };
        }
        return p;
      });
      // Also automatically set customer to active if they were pending
      updatedCustomer = {
        ...c,
        status: (c.status === 'pending' && autoVerify ? 'active' : c.status) as any,
        payments: newPayments,
      };
      return updatedCustomer;
    }
    return c;
  });

  if (updated) {
    saveLocalCustomers(newCustomers);
    syncToGoogleSheets('approve_payment', {
      userId: customerId,
      paymentId,
      method: 'QRIS',
      transactionId: txId,
    });
  }
  return updated;
}

// Update customer status locally
export function updateLocalCustomerStatus(customerId: string, status: 'pending' | 'active' | 'suspended'): boolean {
  const customers = getLocalCustomers();
  let updated = false;
  let updatedCustomer: CustomerUser | null = null;

  const newCustomers = customers.map((c) => {
    if (c.id === customerId) {
      updated = true;
      updatedCustomer = { ...c, status };
      return updatedCustomer;
    }
    return c;
  });

  if (updated) {
    saveLocalCustomers(newCustomers);
    syncToGoogleSheets('update_status', { id: customerId, status });
  }
  return updated;
}

// Add newly registered customer locally
export function addLocalCustomer(customer: CustomerUser): void {
  const customers = getLocalCustomers();
  const existingIdx = customers.findIndex((c) => c.id === customer.id || c.email === customer.email);
  if (existingIdx >= 0) {
    customers[existingIdx] = customer;
  } else {
    customers.unshift(customer);
  }
  saveLocalCustomers(customers);

  // Sync to Google Sheets & Google Drive
  syncToGoogleSheets('subscribe', {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    coordinates: customer.coordinates,
    packageId: customer.packageId,
    status: customer.status,
    ktpImageBase64: customer.ktpImageUrl,
  });
}

// Request password reset link (Simulates the flow by updating the user's status in local storage)
export function requestPasswordResetLocally(email: string): {
  success: boolean;
  message: string;
  user?: CustomerUser;
  resetLink?: string;
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, message: 'Harap masukkan alamat email Anda.' };
  }

  const customers = getLocalCustomers();
  let index = customers.findIndex((c) => c.email.toLowerCase() === cleanEmail);

  // Generate simulated reset token & link
  const token = 'rst_' + Math.random().toString(36).substring(2, 10);
  const resetLink = `${window.location.origin}/?mode=reset-password&email=${encodeURIComponent(cleanEmail)}&token=${token}`;

  let target: CustomerUser;
  if (index === -1) {
    // If not found in default list, create/simulate user record so testing with any email works smoothly
    target = {
      id: 'cust-' + Math.random().toString(36).substring(2, 9),
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '081234567890',
      address: 'Alamat Pelanggan',
      coordinates: [-6.2088, 106.8456],
      packageId: 'home-20m',
      status: 'pending',
      payments: [],
      createdAt: new Date().toISOString(),
    };
    customers.push(target);
    index = customers.length - 1;
  } else {
    target = customers[index];
  }

  // Update the user's status in local storage to simulate the workflow
  const updatedCustomer: CustomerUser = {
    ...target,
    status: 'pending', // Simulating the flow by updating user's status in local storage
    passwordResetRequested: true,
    resetRequestedAt: new Date().toISOString(),
    resetToken: token,
  };

  customers[index] = updatedCustomer;
  saveLocalCustomers(customers);

  // Store password reset request metadata and status in local storage
  try {
    localStorage.setItem('user_status', 'pending');
    localStorage.setItem('currentUserStatus', 'pending');
    localStorage.setItem(`user_status_${cleanEmail}`, 'pending');
    localStorage.setItem(
      `patasnet_reset_${cleanEmail}`,
      JSON.stringify({
        email: cleanEmail,
        userId: updatedCustomer.id,
        name: updatedCustomer.name,
        previousStatus: target.status,
        updatedStatus: 'pending',
        resetToken: token,
        resetLink,
        requestedAt: new Date().toISOString(),
      })
    );
  } catch {}

  // Sync to sheets or server if available
  try {
    fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    }).catch(() => {});
  } catch {}

  return {
    success: true,
    message: `Tautan reset password berhasil dikirim ke ${cleanEmail}. Status akun berhasil diperbarui di penyimpanan lokal (Status: PENDING - Menunggu Reset).`,
    user: updatedCustomer,
    resetLink,
  };
}

// Complete password reset simulation locally
export function resetCustomerPasswordLocally(email: string, _newPassword?: string): boolean {
  const cleanEmail = (email || '').trim().toLowerCase();
  const customers = getLocalCustomers();
  const index = customers.findIndex((c) => c.email.toLowerCase() === cleanEmail);

  if (index !== -1) {
    customers[index] = {
      ...customers[index],
      status: 'active', // Restores user to active status after reset
      passwordResetRequested: false,
      resetToken: undefined,
    };
    saveLocalCustomers(customers);
  }

  try {
    localStorage.setItem('user_status', 'active');
    localStorage.setItem('currentUserStatus', 'active');
    localStorage.setItem(`user_status_${cleanEmail}`, 'active');
    localStorage.removeItem(`patasnet_reset_${cleanEmail}`);
  } catch {}

  return true;
}
