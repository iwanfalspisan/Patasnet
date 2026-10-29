import { CustomerUser, SupportTicket, PaymentRecord, CompanySettings, WifiPackage } from '../types';
import {
  normalizeGoogleDriveImageUrl,
  sanitizeSheetSettings,
  getEnvOrDefaultSheetsUrl,
  isAppsScriptWebAppUrl,
  extractSpreadsheetId,
  EMBEDDED_APPS_SCRIPT_URL,
  EMBEDDED_DRIVE_LOGO_URL,
  DEFAULT_HERO_SLIDES,
} from './googleSheetsIntegration';

const CUSTOMERS_STORAGE_KEY = 'patasnet_local_customers_v1';
const TICKETS_STORAGE_KEY = 'patasnet_local_tickets_v1';
const SETTINGS_STORAGE_KEY = 'patasnet_local_settings_v1';
const PACKAGES_STORAGE_KEY = 'patasnet_local_packages_v1';
const COVERAGE_STORAGE_KEY = 'patasnet_local_coverage_v1';
const LAST_MUTATION_TS_KEY = 'patasnet_last_local_mutation_ts';
export const SHEETS_URL_STORAGE_KEY = 'patasnet_google_sheets_url';

export interface CoverageAreaItem {
  id: number;
  cityName: string;
  regionType: string;
  totalKecamatan?: number;
  totalKelurahan?: number;
  kecamatans: Array<{
    name: string;
    kelurahans: Array<{
      name: string;
      status?: string;
      nodesCount?: number;
    }>;
  }>;
}

function markLocalMutation() {
  try {
    localStorage.setItem(LAST_MUTATION_TS_KEY, String(Date.now()));
  } catch {}
}

function isWithinMutationCooldown(cooldownMs = 7000): boolean {
  try {
    const ts = Number(localStorage.getItem(LAST_MUTATION_TS_KEY) || '0');
    return Date.now() - ts < cooldownMs;
  } catch {
    return false;
  }
}

export function broadcastDataUpdate(
  type: 'settings' | 'packages' | 'coverage' | 'customers' | 'tickets' = 'settings'
) {
  try {
    window.dispatchEvent(new CustomEvent('patasnet:data-updated', { detail: { type } }));
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('patasnet_sync');
      bc.postMessage({ type: `REFRESH_${type.toUpperCase()}`, timestamp: Date.now() });
      bc.close();
    }
  } catch {}
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'Patas.Net',
  legalName: 'SMK Negeri 4 Tasikmalaya',
  tagline: 'Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota',
  coverageText: '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan',
  whatsappNumber: '0812-3456-7890',
  phoneNumber: '+62 899-3299-977',
  email: 'cs@patasnet.id',
  instagramUrl: 'https://instagram.com/patasnet.id',
  facebookUrl: 'https://facebook.com/patasnet.id',
  youtubeUrl: 'https://youtube.com/@patasnet',
  address: 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
  logoText: 'PATAS NET',
  themeColor: '#2563eb',
  logoUrl: EMBEDDED_DRIVE_LOGO_URL,
  promos: [],
  heroSlides: DEFAULT_HERO_SLIDES,
  qrisUrl: '',
  qrisMerchantName: 'PATAS NET - PT AMANUSA TELEMEDIA',
  qrisNmid: 'ID1020039281747',
  qrisAutoVerify: true,
  qrisInstructions:
    'Buka m-Banking atau e-Wallet Anda (BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay), scan barcode QRIS, masukkan nominal sesuai tagihan, lalu klik tombol Konfirmasi Pembayaran QRIS.',
};

export const DEFAULT_PACKAGES: WifiPackage[] = [
  {
    id: 'home-10m',
    name: 'Home Basic 10 Mbps',
    speed: '10 Mbps',
    price: 120000,
    features: [
      'Kecepatan Stabil up to 10 Mbps',
      'Tanpa Batasan / Unlimited Kuota',
      'Ideal untuk 1-3 perangkat',
      'Bisa Sewa STB (+Rp25rb)',
      'GRATIS Biaya Pasang',
    ],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-15m',
    name: 'Home Starter 15 Mbps',
    speed: '15 Mbps',
    price: 160000,
    features: [
      'Kecepatan Stabil up to 15 Mbps',
      'Tanpa Batasan / Unlimited Kuota',
      'Ideal untuk 3-5 perangkat',
      'Bisa Sewa STB (+Rp25rb)',
      'GRATIS Biaya Pasang',
    ],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-20m',
    name: 'Home Lite 20 Mbps',
    speed: '20 Mbps',
    price: 170000,
    features: [
      'Kecepatan Stabil up to 20 Mbps',
      'Tanpa Batasan / Unlimited Kuota',
      'Ideal untuk 4-6 perangkat',
      'Bisa Sewa STB (+Rp25rb)',
      'GRATIS Biaya Pasang',
    ],
    type: 'home',
    popular: true,
  },
  {
    id: 'home-30m',
    name: 'Home Family 30 Mbps',
    speed: '30 Mbps',
    price: 210000,
    features: [
      'Kecepatan Stabil up to 30 Mbps',
      'Tanpa Batasan / Unlimited Kuota',
      'Ideal untuk 6-8 perangkat',
      'Bisa Sewa STB (+Rp25rb)',
      'GRATIS Biaya Pasang',
    ],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-50m',
    name: 'Home Pro 50 Mbps',
    speed: '50 Mbps',
    price: 270000,
    features: [
      'Kecepatan Stabil up to 50 Mbps',
      'Tanpa Batasan / Unlimited Kuota',
      'Ideal untuk 8-10 perangkat',
      'Bisa Sewa STB (+Rp25rb)',
      'GRATIS Biaya Pasang',
    ],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-100m',
    name: 'Home Ultra 100 Mbps',
    speed: '100 Mbps',
    price: 490000,
    features: [
      'Kecepatan Stabil up to 100 Mbps',
      'Tanpa Batasan / Unlimited Kuota',
      'Ideal untuk 10-15 perangkat',
      'Bisa Sewa STB (+Rp25rb)',
      'GRATIS Biaya Pasang',
    ],
    type: 'home',
    popular: false,
  },
  {
    id: 'patasnet-prime',
    name: 'Patas Net PRIME 50 Mbps',
    speed: 'Up to 50 Mbps',
    price: 220000,
    features: [
      '100% Fiber Optik Unlimited',
      'Sosmed & Video Streaming HD',
      'Upload & Download Simetris 1:1',
      'Ideal untuk 10-15 perangkat aktif',
      'Support CCTV Online Rumah',
      'Streaming Smart TV 4K',
      'GRATIS Biaya Pasang',
    ],
    type: 'business',
    popular: false,
  },
  {
    id: 'patasnet-exclusive',
    name: 'Patas Net EXCLUSIVE 100 Mbps',
    speed: 'Up to 100 Mbps',
    price: 275000,
    features: [
      '100% Fiber Optik Unlimited',
      'Sosmed & Video Streaming HD',
      'Upload & Download Simetris 1:1',
      'Ideal untuk 10-15 perangkat aktif',
      'Support 2 CCTV Online Rumah',
      'Streaming Smart TV 4K',
      'Gaming Online Stabil',
      'GRATIS Biaya Pasang',
    ],
    type: 'business',
    popular: true,
  },
  {
    id: 'patasnet-exclusive2',
    name: 'Patas Net EXCLUSIVE II 200 Mbps',
    speed: 'Up to 200 Mbps',
    price: 310000,
    features: [
      '100% Fiber Optik Unlimited',
      'Sosmed & Video Streaming HD',
      'Upload & Download Simetris 1:1',
      'Ideal untuk 10-15 perangkat aktif',
      'Support 3 CCTV Online Rumah',
      'Streaming Smart TV 4K',
      'Gaming Online Stabil',
      'GRATIS Biaya Pasang',
    ],
    type: 'business',
    popular: false,
  },
  {
    id: 'patasnet-bisnis',
    name: 'Patas Net BISNIS 300 Mbps',
    speed: 'Up to 300 Mbps',
    price: 375000,
    features: [
      '100% Fiber Optik Unlimited',
      'Sosmed & Video Streaming HD',
      'Upload & Download Simetris 1:1',
      'Ideal untuk 10-15 perangkat aktif',
      'Support 5+ CCTV Online Rumah',
      'Streaming Smart TV 4K',
      'Gaming Online Super Stabil',
      'GRATIS Biaya Pasang',
    ],
    type: 'business',
    popular: false,
  },
];

export const DEFAULT_COVERAGE_AREAS: CoverageAreaItem[] = [
  {
    id: 1,
    cityName: 'Jakarta Selatan',
    regionType: 'Kota',
    totalKecamatan: 4,
    totalKelurahan: 14,
    kecamatans: [
      {
        name: 'Kebayoran Baru',
        kelurahans: [
          { name: 'Rawa Barat', status: 'active', nodesCount: 12 },
          { name: 'Selong', status: 'active', nodesCount: 8 },
          { name: 'Melawai', status: 'active', nodesCount: 15 },
          { name: 'Kramat Pela', status: 'active', nodesCount: 11 },
          { name: 'Gunung', status: 'active', nodesCount: 9 },
        ],
      },
      {
        name: 'Cilandak',
        kelurahans: [
          { name: 'Cipete Selatan', status: 'active', nodesCount: 14 },
          { name: 'Gandaria Selatan', status: 'active', nodesCount: 16 },
          { name: 'Pondok Labu', status: 'active', nodesCount: 22 },
          { name: 'Lebak Bulus', status: 'active', nodesCount: 18 },
        ],
      },
      {
        name: 'Mampang Prapatan',
        kelurahans: [
          { name: 'Kuningan Barat', status: 'active', nodesCount: 25 },
          { name: 'Pela Mampang', status: 'active', nodesCount: 19 },
          { name: 'Bangka', status: 'active', nodesCount: 15 },
        ],
      },
      {
        name: 'Tebet',
        kelurahans: [
          { name: 'Menteng Dalam', status: 'active', nodesCount: 14 },
          { name: 'Tebet Barat', status: 'active', nodesCount: 17 },
        ],
      },
    ],
  },
  {
    id: 2,
    cityName: 'Depok',
    regionType: 'Kota',
    totalKecamatan: 3,
    totalKelurahan: 9,
    kecamatans: [
      {
        name: 'Beji',
        kelurahans: [
          { name: 'Pondok Cina', status: 'active', nodesCount: 32 },
          { name: 'Beji Timur', status: 'active', nodesCount: 12 },
          { name: 'Kemiri Muka', status: 'active', nodesCount: 18 },
        ],
      },
      {
        name: 'Pancoran Mas',
        kelurahans: [
          { name: 'Depok Jaya', status: 'active', nodesCount: 14 },
          { name: 'Mampang', status: 'active', nodesCount: 10 },
          { name: 'Pancoran Mas', status: 'active', nodesCount: 16 },
        ],
      },
      {
        name: 'Cinere',
        kelurahans: [
          { name: 'Cinere', status: 'active', nodesCount: 20 },
          { name: 'Gandul', status: 'active', nodesCount: 15 },
          { name: 'Pangkalan Jati', status: 'active', nodesCount: 11 },
        ],
      },
    ],
  },
  {
    id: 3,
    cityName: 'Tangerang Selatan',
    regionType: 'Kota',
    totalKecamatan: 3,
    totalKelurahan: 8,
    kecamatans: [
      {
        name: 'Serpong',
        kelurahans: [
          { name: 'Lengkong Gudang', status: 'active', nodesCount: 24 },
          { name: 'Serpong', status: 'active', nodesCount: 18 },
          { name: 'Cilenggang', status: 'active', nodesCount: 14 },
        ],
      },
      {
        name: 'Ciputat',
        kelurahans: [
          { name: 'Ciputat', status: 'active', nodesCount: 15 },
          { name: 'Cipayung', status: 'active', nodesCount: 12 },
          { name: 'Sawah Baru', status: 'active', nodesCount: 10 },
        ],
      },
      {
        name: 'Pondok Aren',
        kelurahans: [
          { name: 'Jurang Mangu Timur', status: 'active', nodesCount: 22 },
          { name: 'Pondok Jaya', status: 'active', nodesCount: 16 },
        ],
      },
    ],
  },
  {
    id: 4,
    cityName: 'Bogor',
    regionType: 'Kota',
    totalKecamatan: 2,
    totalKelurahan: 6,
    kecamatans: [
      {
        name: 'Bogor Timur',
        kelurahans: [
          { name: 'Baranangsiang', status: 'active', nodesCount: 19 },
          { name: 'Katulampa', status: 'active', nodesCount: 28 },
          { name: 'Sukasari', status: 'active', nodesCount: 11 },
        ],
      },
      {
        name: 'Bogor Selatan',
        kelurahans: [
          { name: 'Batutulis', status: 'active', nodesCount: 15 },
          { name: 'Bondongan', status: 'active', nodesCount: 12 },
          { name: 'Empang', status: 'active', nodesCount: 20 },
        ],
      },
    ],
  },
  {
    id: 5,
    cityName: 'Ciomas (Bogor)',
    regionType: 'Kabupaten',
    totalKecamatan: 1,
    totalKelurahan: 3,
    kecamatans: [
      {
        name: 'Ciomas',
        kelurahans: [
          { name: 'Ciomas Rahayu', status: 'active', nodesCount: 24 },
          { name: 'Ciomas Indah', status: 'active', nodesCount: 15 },
          { name: 'Pagelaran', status: 'active', nodesCount: 31 },
        ],
      },
    ],
  },
];

export const INITIAL_FALLBACK_CUSTOMERS: CustomerUser[] = [
  {
    id: 'TR-1001',
    name: 'Budi Santoso',
    email: 'budi@gmail.com',
    phone: '081234567890',
    address: 'Jl. Melawai Raya No. 45, Kebayoran Baru, Jakarta Selatan',
    coordinates: [-6.2443, 106.8005],
    packageId: 'home-20m',
    status: 'active',
    ktpImageUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-06-15',
    payments: [
      {
        id: 'PAY-7001',
        date: '2026-06-15 10:25:00',
        amount: 170000,
        status: 'paid',
        billingPeriod: 'Juni 2026',
        method: 'Transfer Bank BCA',
        transactionId: 'TX-88001122',
        proofOfPaymentUrl:
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'PAY-7002',
        date: '2026-07-01 08:00:00',
        amount: 170000,
        status: 'unpaid',
        billingPeriod: 'Juli 2026',
      },
    ],
    tickets: [],
  },
  {
    id: 'TR-1002',
    name: 'Dewi Lestari',
    email: 'dewi@gmail.com',
    phone: '081298765432',
    address: 'Jl. Cipete Raya No. 12, Cilandak, Jakarta Selatan',
    coordinates: [-6.2781, 106.8052],
    packageId: 'patasnet-exclusive',
    status: 'active',
    ktpImageUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-06-20',
    payments: [
      {
        id: 'PAY-7003',
        date: '2026-06-20 14:15:00',
        amount: 275000,
        status: 'paid',
        billingPeriod: 'Juni 2026',
        method: 'QRIS',
        transactionId: 'TX-88003344',
        proofOfPaymentUrl:
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'PAY-7004',
        date: '2026-07-02 16:40:00',
        amount: 275000,
        status: 'pending_verification',
        billingPeriod: 'Juli 2026',
        method: 'Transfer Bank Mandiri',
        proofOfPaymentUrl:
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
    ],
    tickets: [],
  },
  {
    id: 'TR-1003',
    name: 'Andi Wijaya',
    email: 'andi@gmail.com',
    phone: '081345678901',
    address: 'Jl. Margonda Raya No. 102, Beji, Depok',
    coordinates: [-6.3651, 106.8328],
    packageId: 'home-50m',
    status: 'pending',
    ktpImageUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-07-03',
    payments: [
      {
        id: 'PAY-7005',
        date: '2026-07-03 11:00:00',
        amount: 270000,
        status: 'unpaid',
        billingPeriod: 'Juli 2026',
      },
    ],
    tickets: [],
  },
];

export const INITIAL_FALLBACK_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-101',
    userId: 'TR-1001',
    userName: 'Budi Santoso',
    email: 'budi@gmail.com',
    phone: '081234567890',
    message: 'Lampu indikator PON pada modem berkedip merah sejak pagi ini, mohon pengecekan.',
    date: '2026-07-02 09:30',
    status: 'open',
  },
];

// ==========================================
// GOOGLE SHEETS URL HELPERS
// ==========================================

export function getGoogleSheetsWebhookUrl(): string {
  try {
    const saved = localStorage.getItem(SHEETS_URL_STORAGE_KEY);
    if (saved && saved.trim() !== '') {
      const trimmed = saved.trim();
      if (trimmed.includes('AKfycbxXScZJqOQ9myhQkmxUBClZx8LGj0xBgPxIskOTBMr_o4-hfQ-Tqq0dqus6jaOZX5gr')) {
        localStorage.setItem(SHEETS_URL_STORAGE_KEY, EMBEDDED_APPS_SCRIPT_URL);
        return EMBEDDED_APPS_SCRIPT_URL;
      }
      if (isAppsScriptWebAppUrl(trimmed)) return trimmed;
      const envUrl = getEnvOrDefaultSheetsUrl();
      if (isAppsScriptWebAppUrl(envUrl)) return envUrl;
      return trimmed;
    }
  } catch {}
  return getEnvOrDefaultSheetsUrl() || EMBEDDED_APPS_SCRIPT_URL;
}

export function saveGoogleSheetsWebhookUrl(url: string) {
  try {
    localStorage.setItem(SHEETS_URL_STORAGE_KEY, url.trim());
  } catch (err) {
    console.warn('Failed to save Google Sheets URL to localStorage:', err);
  }
}

// ==========================================
// SETTINGS STORAGE
// ==========================================

export function getLocalSettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_COMPANY_SETTINGS));
      return DEFAULT_COMPANY_SETTINGS;
    }
    const parsed = sanitizeSheetSettings({
      ...DEFAULT_COMPANY_SETTINGS,
      ...JSON.parse(raw),
    });
    delete (parsed as any)._hadFormulaError;
    if (parsed.logoUrl) parsed.logoUrl = normalizeGoogleDriveImageUrl(parsed.logoUrl);
    if (parsed.qrisUrl) parsed.qrisUrl = normalizeGoogleDriveImageUrl(parsed.qrisUrl);
    if (Array.isArray(parsed.promos)) {
      parsed.promos = parsed.promos.map((p: string) => normalizeGoogleDriveImageUrl(p));
    }
    if (Array.isArray(parsed.heroSlides) && parsed.heroSlides.length > 0) {
      parsed.heroSlides = parsed.heroSlides.map((s: string) => normalizeGoogleDriveImageUrl(s));
    } else {
      parsed.heroSlides = DEFAULT_HERO_SLIDES;
    }
    return parsed;
  } catch {
    return DEFAULT_COMPANY_SETTINGS;
  }
}

export function saveLocalSettings(settings: CompanySettings): CompanySettings {
  try {
    const cleaned = sanitizeSheetSettings({
      ...DEFAULT_COMPANY_SETTINGS,
      ...settings,
    });
    delete (cleaned as any)._hadFormulaError;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch (e) {
    console.warn('Error saving local settings:', e);
    return settings;
  }
}

// ==========================================
// WIFI PACKAGES STORAGE (LOCAL + CLOUD SYNC)
// ==========================================

export function getLocalPackages(): WifiPackage[] {
  try {
    const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any) => ({
          id: String(p.id || `pkg-${Date.now()}`),
          name: String(p.name || 'Paket Internet'),
          speed: String(p.speed || '20 Mbps'),
          price: Number(p.price) || 150000,
          features: Array.isArray(p.features)
            ? p.features
            : typeof p.features === 'string'
            ? p.features
                .split(/\r?\n|,/)
                .map((f: string) => f.trim())
                .filter(Boolean)
            : ['100% Fiber Optik Unlimited', 'GRATIS Biaya Pasang'],
          type: p.type === 'business' ? 'business' : 'home',
          popular: Boolean(p.popular || p.isPopular),
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to read packages from localStorage:', e);
  }
  localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(DEFAULT_PACKAGES));
  return DEFAULT_PACKAGES;
}

export function saveLocalPackages(packages: WifiPackage[], syncToCloud = true): WifiPackage[] {
  const normalized: WifiPackage[] = packages.map((p) => ({
    id: String(p.id),
    name: String(p.name).trim(),
    speed: String(p.speed).trim(),
    price: Number(p.price) || 0,
    features: Array.isArray(p.features) ? p.features : [],
    type: p.type === 'business' ? 'business' : 'home',
    popular: Boolean(p.popular),
  }));

  try {
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(normalized));
  } catch {}

  if (syncToCloud) {
    markLocalMutation();
    const currentSettings = getLocalSettings();
    const updatedSettings: CompanySettings = {
      ...currentSettings,
      packagesJson: JSON.stringify(normalized),
    };
    saveLocalSettings(updatedSettings);
    syncToGoogleSheets('update_settings', updatedSettings).catch(() => {});
    syncToGoogleSheets('update_packages', { packages: normalized }).catch(() => {});
  }

  broadcastDataUpdate('packages');
  return normalized;
}

export function addOrUpdateLocalPackage(pkg: WifiPackage): WifiPackage[] {
  const current = getLocalPackages();
  const idx = current.findIndex((p) => p.id === pkg.id);
  let next: WifiPackage[];
  if (idx >= 0) {
    next = [...current];
    next[idx] = pkg;
  } else {
    next = [...current, pkg];
  }
  return saveLocalPackages(next, true);
}

export function deleteLocalPackage(id: string): WifiPackage[] {
  const current = getLocalPackages();
  const next = current.filter((p) => p.id !== id);
  return saveLocalPackages(next, true);
}

// ==========================================
// COVERAGE AREAS STORAGE (LOCAL + CLOUD SYNC)
// ==========================================

function normalizeCoverageItems(rawList: any[]): CoverageAreaItem[] {
  return rawList.map((c: any, idx: number) => {
    const rawKecs = Array.isArray(c.kecamatans)
      ? c.kecamatans
      : Array.isArray(c.kecamatan)
      ? c.kecamatan
      : [];

    const kecamatans = rawKecs.map((k: any) => {
      const rawKels = Array.isArray(k.kelurahans)
        ? k.kelurahans
        : Array.isArray(k.kelurahan)
        ? k.kelurahan
        : [];
      return {
        name: String(k.name || ''),
        kelurahans: rawKels.map((kl: any) => ({
          name: String(typeof kl === 'string' ? kl : kl.name || ''),
          status: kl.status || 'active',
          nodesCount: Number(kl.nodesCount ?? kl.nodes ?? 12) || 12,
        })),
      };
    });

    const totalKelurahan = kecamatans.reduce((acc: number, k: any) => acc + (k.kelurahans?.length || 0), 0);
    return {
      id: Number(c.id) || idx + 1,
      cityName: String(c.cityName || c.name || 'Wilayah'),
      regionType: c.regionType === 'Kabupaten' || c.type === 'Kabupaten' ? 'Kabupaten' : 'Kota',
      totalKecamatan: kecamatans.length,
      totalKelurahan,
      kecamatans,
    };
  });
}

export function computeCoverageSummaryText(coverageList: CoverageAreaItem[]): string {
  const totalCities = coverageList.length;
  const totalKec = coverageList.reduce((acc, c) => acc + (c.kecamatans?.length || 0), 0);
  const totalKel = coverageList.reduce(
    (acc, c) => acc + (c.kecamatans || []).reduce((kAcc, k) => kAcc + (k.kelurahans?.length || 0), 0),
    0
  );
  return `${totalCities} Kota/Kabupaten, ${totalKec} Kecamatan, ${totalKel} Kelurahan`;
}

export function getLocalCoverage(): CoverageAreaItem[] {
  try {
    const raw = localStorage.getItem(COVERAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeCoverageItems(parsed);
      }
    }
  } catch (e) {
    console.warn('Failed to read coverage from localStorage:', e);
  }
  localStorage.setItem(COVERAGE_STORAGE_KEY, JSON.stringify(DEFAULT_COVERAGE_AREAS));
  return DEFAULT_COVERAGE_AREAS;
}

export function saveLocalCoverage(coverage: CoverageAreaItem[], syncToCloud = true): CoverageAreaItem[] {
  const normalized = normalizeCoverageItems(coverage);
  try {
    localStorage.setItem(COVERAGE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {}

  const summaryText = computeCoverageSummaryText(normalized);
  const currentSettings = getLocalSettings();
  const updatedSettings: CompanySettings = {
    ...currentSettings,
    coverageText: summaryText,
    coverageJson: JSON.stringify(normalized),
  };
  saveLocalSettings(updatedSettings);

  if (syncToCloud) {
    markLocalMutation();
    syncToGoogleSheets('update_settings', updatedSettings).catch(() => {});
    syncToGoogleSheets('update_coverage', { coverage: normalized }).catch(() => {});
  }

  broadcastDataUpdate('coverage');
  broadcastDataUpdate('settings');
  return normalized;
}

export function addLocalCoverageCity(cityName: string, regionType: string): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const trimmed = cityName.trim();
  if (!trimmed) return current;
  if (current.some((c) => c.cityName.toLowerCase() === trimmed.toLowerCase())) {
    return current;
  }
  const next: CoverageAreaItem[] = [
    ...current,
    {
      id: Date.now(),
      cityName: trimmed,
      regionType: regionType === 'Kabupaten' ? 'Kabupaten' : 'Kota',
      totalKecamatan: 0,
      totalKelurahan: 0,
      kecamatans: [],
    },
  ];
  return saveLocalCoverage(next, true);
}

export function updateLocalCoverageCity(
  oldCityName: string,
  newCityName: string,
  regionType: string
): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const trimmed = newCityName.trim();
  if (!trimmed) return current;
  const next = current.map((c) =>
    c.cityName === oldCityName
      ? { ...c, cityName: trimmed, regionType: regionType === 'Kabupaten' ? 'Kabupaten' : 'Kota' }
      : c
  );
  return saveLocalCoverage(next, true);
}

export function deleteLocalCoverageCity(cityName: string): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const next = current.filter((c) => c.cityName !== cityName);
  return saveLocalCoverage(next, true);
}

export function addLocalKecamatan(cityName: string, name: string): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const trimmed = name.trim();
  if (!trimmed) return current;
  const next = current.map((c) => {
    if (c.cityName !== cityName) return c;
    if (c.kecamatans.some((k) => k.name.toLowerCase() === trimmed.toLowerCase())) return c;
    return {
      ...c,
      kecamatans: [...c.kecamatans, { name: trimmed, kelurahans: [] }],
    };
  });
  return saveLocalCoverage(next, true);
}

export function updateLocalKecamatan(
  cityName: string,
  oldName: string,
  newName: string
): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const trimmed = newName.trim();
  if (!trimmed) return current;
  const next = current.map((c) => {
    if (c.cityName !== cityName) return c;
    return {
      ...c,
      kecamatans: c.kecamatans.map((k) => (k.name === oldName ? { ...k, name: trimmed } : k)),
    };
  });
  return saveLocalCoverage(next, true);
}

export function deleteLocalKecamatan(cityName: string, name: string): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const next = current.map((c) => {
    if (c.cityName !== cityName) return c;
    return {
      ...c,
      kecamatans: c.kecamatans.filter((k) => k.name !== name),
    };
  });
  return saveLocalCoverage(next, true);
}

export function addLocalKelurahan(
  cityName: string,
  kecamatanName: string,
  name: string,
  nodesCount = 15
): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const trimmed = name.trim();
  if (!trimmed) return current;
  const next = current.map((c) => {
    if (c.cityName !== cityName) return c;
    return {
      ...c,
      kecamatans: c.kecamatans.map((k) => {
        if (k.name !== kecamatanName) return k;
        const existingIdx = k.kelurahans.findIndex(
          (kl) => kl.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (existingIdx >= 0) {
          const updatedKels = [...k.kelurahans];
          updatedKels[existingIdx] = {
            name: trimmed,
            status: 'active',
            nodesCount: Number(nodesCount) || 15,
          };
          return { ...k, kelurahans: updatedKels };
        }
        return {
          ...k,
          kelurahans: [
            ...k.kelurahans,
            { name: trimmed, status: 'active', nodesCount: Number(nodesCount) || 15 },
          ],
        };
      }),
    };
  });
  return saveLocalCoverage(next, true);
}

export function updateLocalKelurahan(
  cityName: string,
  kecamatanName: string,
  oldName: string,
  newName: string,
  nodesCount = 15
): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const trimmed = newName.trim();
  if (!trimmed) return current;
  const next = current.map((c) => {
    if (c.cityName !== cityName) return c;
    return {
      ...c,
      kecamatans: c.kecamatans.map((k) => {
        if (k.name !== kecamatanName) return k;
        return {
          ...k,
          kelurahans: k.kelurahans.map((kl) =>
            kl.name === oldName
              ? { ...kl, name: trimmed, nodesCount: Number(nodesCount) || kl.nodesCount || 15 }
              : kl
          ),
        };
      }),
    };
  });
  return saveLocalCoverage(next, true);
}

export function deleteLocalKelurahan(
  cityName: string,
  kecamatanName: string,
  name: string
): CoverageAreaItem[] {
  const current = getLocalCoverage();
  const next = current.map((c) => {
    if (c.cityName !== cityName) return c;
    return {
      ...c,
      kecamatans: c.kecamatans.map((k) => {
        if (k.name !== kecamatanName) return k;
        return {
          ...k,
          kelurahans: k.kelurahans.filter((kl) => kl.name !== name),
        };
      }),
    };
  });
  return saveLocalCoverage(next, true);
}

// ==========================================
// GOOGLE SHEETS DIRECT FETCH & SYNC
// ==========================================

async function fetchDirectSpreadsheetGviz(spreadsheetId: string): Promise<{
  customers: CustomerUser[];
  tickets: SupportTicket[];
  settings?: CompanySettings;
} | null> {
  const fetchSheetRows = async (sheetName: string): Promise<any[][]> => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) return [];
      const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      const rows = json?.table?.rows || [];
      return rows.map((r: any) => (r.c || []).map((cell: any) => (cell ? (cell.v ?? cell.f ?? '') : '')));
    } catch {
      return [];
    }
  };

  try {
    const [pelangganRows, pembayaranRows, tiketRows, pengaturanRows] = await Promise.all([
      fetchSheetRows('Pelanggan'),
      fetchSheetRows('Pembayaran'),
      fetchSheetRows('Tiket'),
      fetchSheetRows('Pengaturan'),
    ]);

    if (pelangganRows.length === 0 && pengaturanRows.length === 0) {
      return null;
    }

    const customers: CustomerUser[] = pelangganRows
      .filter((r) => r[1] && String(r[1]) !== 'ID Pelanggan')
      .map((r) => {
        const id = String(r[1]);
        const coordsStr = String(r[6] || '-6.2088, 106.8456');
        const coords: [number, number] = coordsStr.includes(',')
          ? (coordsStr.split(',').map((n) => parseFloat(n.trim())) as [number, number])
          : [-6.2088, 106.8456];

        const payments: PaymentRecord[] = pembayaranRows
          .filter((p) => String(p[2]) === id)
          .map((p) => ({
            id: String(p[1]),
            date: String(p[0] || '').substring(0, 19),
            amount: Number(p[4]) || 170000,
            billingPeriod: String(p[5] || 'Tagihan Berjalan'),
            method: String(p[6] || 'Transfer Bank'),
            status: (p[7] || 'unpaid') as 'unpaid' | 'pending_verification' | 'paid',
            proofOfPaymentUrl: normalizeGoogleDriveImageUrl(String(p[8] || '')) || undefined,
            transactionId: p[9] ? String(p[9]) : undefined,
          }));

        return {
          id,
          name: String(r[2] || ''),
          email: String(r[3] || ''),
          phone: String(r[4] || ''),
          address: String(r[5] || ''),
          coordinates: coords,
          packageId: String(r[7] || 'home-20m'),
          status: (r[8] || 'pending') as 'pending' | 'active' | 'suspended',
          ktpImageUrl: normalizeGoogleDriveImageUrl(String(r[9] || '')) || undefined,
          createdAt: String(r[0] || '').substring(0, 10),
          payments,
          tickets: [],
        };
      });

    const tickets: SupportTicket[] = tiketRows
      .filter((t) => t[1] && String(t[1]) !== 'ID Tiket')
      .map((t) => ({
        id: String(t[1]),
        userId: String(t[2] || ''),
        userName: String(t[3] || ''),
        email: '',
        phone: String(t[4] || ''),
        message: String(t[5] || ''),
        date: String(t[0] || ''),
        status: (t[6] === 'resolved' ? 'resolved' : 'open') as 'open' | 'resolved',
      }));

    let settings: CompanySettings | undefined = undefined;
    if (pengaturanRows.length > 0) {
      const sObj: any = {};
      pengaturanRows.forEach((row) => {
        const key = String(row[0] || '').trim();
        const val = row[1];
        if (key && key !== 'Key' && val !== undefined && val !== '') {
          if (key === 'promos' || key === 'heroSlides') {
            try {
              sObj[key] = typeof val === 'string' ? JSON.parse(val) : val;
            } catch {
              sObj[key] = [];
            }
          } else if (key === 'qrisAutoVerify') {
            sObj[key] = String(val) === 'true' || val === true;
          } else {
            sObj[key] = val;
          }
        }
      });
      if (Object.keys(sObj).length > 0) {
        const cleaned = sanitizeSheetSettings({
          ...DEFAULT_COMPANY_SETTINGS,
          ...sObj,
        });
        delete (cleaned as any)._hadFormulaError;
        settings = cleaned;
      }
    }

    return { customers, tickets, settings };
  } catch {
    return null;
  }
}

export async function fetchFromGoogleSheets(): Promise<{
  customers: CustomerUser[];
  tickets: SupportTicket[];
  settings?: CompanySettings;
  packages?: WifiPackage[];
  coverage?: CoverageAreaItem[];
} | null> {
  const url = getGoogleSheetsWebhookUrl();
  if (!url) return null;

  const inCooldown = isWithinMutationCooldown();

  const sheetId = extractSpreadsheetId(url);
  if (sheetId && !isAppsScriptWebAppUrl(url)) {
    const directData = await fetchDirectSpreadsheetGviz(sheetId);
    if (directData) {
      if (directData.customers.length > 0 && !inCooldown) saveLocalCustomers(directData.customers);
      if (directData.tickets.length > 0 && !inCooldown) saveLocalTickets(directData.tickets);
      if (directData.settings && !inCooldown) saveLocalSettings(directData.settings);
      return directData;
    }
    return null;
  }

  try {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}action=get_all&t=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (data && data.status === 'success') {
      const normalizedCustomers: CustomerUser[] =
        !inCooldown && Array.isArray(data.customers) && data.customers.length > 0
          ? data.customers.map((c: CustomerUser) => ({
              ...c,
              ktpImageUrl: normalizeGoogleDriveImageUrl(c.ktpImageUrl) || c.ktpImageUrl,
              payments: Array.isArray(c.payments)
                ? c.payments.map((p: PaymentRecord) => ({
                    ...p,
                    proofOfPaymentUrl:
                      normalizeGoogleDriveImageUrl(p.proofOfPaymentUrl) || p.proofOfPaymentUrl,
                  }))
                : [],
            }))
          : getLocalCustomers();

      const normalizedTickets: SupportTicket[] =
        !inCooldown && Array.isArray(data.tickets) && data.tickets.length > 0
          ? data.tickets.map((t: SupportTicket) => ({
              ...t,
              status: t.status === 'resolved' ? 'resolved' : 'open',
            }))
          : getLocalTickets();

      if (Array.isArray(data.customers) && data.customers.length > 0 && !inCooldown) {
        saveLocalCustomers(normalizedCustomers);
      }
      if (Array.isArray(data.tickets) && data.tickets.length > 0 && !inCooldown) {
        saveLocalTickets(normalizedTickets);
      }

      let resolvedPackages: WifiPackage[] | undefined;
      let resolvedCoverage: CoverageAreaItem[] | undefined;

      if (Array.isArray(data.packages) && data.packages.length > 0 && !inCooldown) {
        resolvedPackages = saveLocalPackages(data.packages, false);
      }

      if (Array.isArray(data.coverage) && data.coverage.length > 0 && !inCooldown) {
        resolvedCoverage = saveLocalCoverage(data.coverage, false);
      }

      let normalizedSettings: CompanySettings | undefined = undefined;
      if (data.settings && typeof data.settings === 'object' && !inCooldown) {
        const currentLocal = getLocalSettings();
        const rawSettings = sanitizeSheetSettings(data.settings);
        const hadFormulaError = Boolean(rawSettings._hadFormulaError);
        delete rawSettings._hadFormulaError;

        // Parse packagesJson & coverageJson stored inside Pengaturan sheet if present
        if (rawSettings.packagesJson && !resolvedPackages) {
          try {
            const parsedPkgs = JSON.parse(rawSettings.packagesJson);
            if (Array.isArray(parsedPkgs) && parsedPkgs.length > 0) {
              resolvedPackages = saveLocalPackages(parsedPkgs, false);
            }
          } catch {}
        }

        if (rawSettings.coverageJson && !resolvedCoverage) {
          try {
            const parsedCov = JSON.parse(rawSettings.coverageJson);
            if (Array.isArray(parsedCov) && parsedCov.length > 0) {
              resolvedCoverage = saveLocalCoverage(parsedCov, false);
            }
          } catch {}
        }

        const activeCov = getLocalCoverage();
        const computedCovText =
          activeCov && activeCov.length > 0
            ? computeCoverageSummaryText(activeCov)
            : rawSettings.coverageText || currentLocal.coverageText;

        normalizedSettings = {
          ...currentLocal,
          ...rawSettings,
          coverageText: computedCovText,
          logoUrl:
            normalizeGoogleDriveImageUrl(rawSettings.logoUrl) ||
            currentLocal.logoUrl ||
            DEFAULT_COMPANY_SETTINGS.logoUrl,
          qrisUrl:
            normalizeGoogleDriveImageUrl(rawSettings.qrisUrl) ||
            currentLocal.qrisUrl ||
            '',
          promos: Array.isArray(rawSettings.promos)
            ? rawSettings.promos.map((p: string) => normalizeGoogleDriveImageUrl(p) || p)
            : currentLocal.promos || [],
          heroSlides:
            Array.isArray(rawSettings.heroSlides) && rawSettings.heroSlides.length > 0
              ? rawSettings.heroSlides.map((s: string) => normalizeGoogleDriveImageUrl(s) || s)
              : currentLocal.heroSlides || DEFAULT_HERO_SLIDES,
        };
        saveLocalSettings(normalizedSettings);

        if (hadFormulaError) {
          syncToGoogleSheets('update_settings', normalizedSettings).catch(() => {});
        }
      }

      return {
        customers: normalizedCustomers,
        tickets: normalizedTickets,
        settings: normalizedSettings || getLocalSettings(),
        packages: resolvedPackages || getLocalPackages(),
        coverage: resolvedCoverage || getLocalCoverage(),
      };
    }
  } catch (err) {
    console.warn('Direct Google Sheets fetch failed, using cached data:', err);
  }
  return null;
}

export async function syncToGoogleSheets(action: string, payload: any): Promise<any | null> {
  const url = getGoogleSheetsWebhookUrl();
  const bodyObj = {
    action,
    timestamp: new Date().toISOString(),
    ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
    data: payload,
  };
  const bodyStr = JSON.stringify(bodyObj);

  // Also notify local server webhook in background so server DB & SSE stay in sync across devices
  try {
    fetch('/api/dev/sheets/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, customUrl: url }),
    }).catch(() => {});
  } catch {}

  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyStr,
      redirect: 'follow',
    });

    if (response.ok) {
      const resJson = await response.json();
      return resJson;
    }
  } catch {
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyStr,
      });
    } catch (innerErr) {
      console.warn('Google Sheets background sync error:', innerErr);
    }
  }
  return null;
}

// ==========================================
// CUSTOMERS & TICKETS LOCAL HELPERS
// ==========================================

export function getLocalCustomers(): CustomerUser[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(INITIAL_FALLBACK_CUSTOMERS));
      return INITIAL_FALLBACK_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_FALLBACK_CUSTOMERS;
  } catch {
    return INITIAL_FALLBACK_CUSTOMERS;
  }
}

export function saveLocalCustomers(customers: CustomerUser[]) {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  } catch (e) {
    console.warn('Error saving local customers:', e);
  }
}

export function getLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(INITIAL_FALLBACK_TICKETS));
      return INITIAL_FALLBACK_TICKETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_FALLBACK_TICKETS;
  } catch {
    return INITIAL_FALLBACK_TICKETS;
  }
}

export function saveLocalTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.warn('Error saving local tickets:', e);
  }
}

export function addLocalTicket(newTicket: SupportTicket): SupportTicket[] {
  markLocalMutation();
  const current = getLocalTickets();
  const exists = current.some((t) => t.id === newTicket.id);
  const updated = exists
    ? current.map((t) => (t.id === newTicket.id ? newTicket : t))
    : [newTicket, ...current];
  saveLocalTickets(updated);

  // Also attach to customer's embedded tickets array if present
  if (newTicket.userId || newTicket.email) {
    const custs = getLocalCustomers().map((c) => {
      if (
        (newTicket.userId && c.id === newTicket.userId) ||
        (newTicket.email && c.email.toLowerCase() === newTicket.email.toLowerCase())
      ) {
        const prevTickets = Array.isArray(c.tickets) ? c.tickets : [];
        const hasTicket = prevTickets.some((t) => t.id === newTicket.id);
        return {
          ...c,
          tickets: hasTicket
            ? prevTickets.map((t) => (t.id === newTicket.id ? newTicket : t))
            : [newTicket, ...prevTickets],
        };
      }
      return c;
    });
    saveLocalCustomers(custs);
  }

  broadcastDataUpdate('tickets');
  return updated;
}

export function updateLocalTicketStatus(
  ticketId: string,
  status: 'open' | 'resolved'
): SupportTicket[] {
  markLocalMutation();
  const current = getLocalTickets();
  const updated = current.map((t) => (t.id === ticketId ? { ...t, status } : t));
  saveLocalTickets(updated);

  // Also update inside customers' embedded tickets array
  const custs = getLocalCustomers().map((c) => {
    if (!Array.isArray(c.tickets) || c.tickets.length === 0) return c;
    return {
      ...c,
      tickets: c.tickets.map((t) => (t.id === ticketId ? { ...t, status } : t)),
    };
  });
  saveLocalCustomers(custs);

  syncToGoogleSheets('update_ticket_status', { id: ticketId, status }).catch(() => {});
  broadcastDataUpdate('tickets');
  return updated;
}

export function addLocalCustomer(newCustomer: CustomerUser): CustomerUser[] {
  markLocalMutation();
  const current = getLocalCustomers();
  const exists = current.some((c) => c.id === newCustomer.id || c.email === newCustomer.email);
  const updated = exists
    ? current.map((c) => (c.id === newCustomer.id ? newCustomer : c))
    : [newCustomer, ...current];
  saveLocalCustomers(updated);
  broadcastDataUpdate('customers');
  return updated;
}

export function deleteLocalCustomer(id: string): CustomerUser[] {
  markLocalMutation();
  const current = getLocalCustomers();
  const updated = current.filter((c) => c.id !== id);
  saveLocalCustomers(updated);
  syncToGoogleSheets('delete_customer', { id }).catch(() => {});
  broadcastDataUpdate('customers');
  return updated;
}

export function updateLocalCustomerStatus(
  id: string,
  status: 'pending' | 'active' | 'suspended'
): CustomerUser[] {
  markLocalMutation();
  const current = getLocalCustomers();
  const updated = current.map((c) => (c.id === id ? { ...c, status } : c));
  saveLocalCustomers(updated);
  syncToGoogleSheets('update_status', { id, status });
  broadcastDataUpdate('customers');
  return updated;
}

export function requestPasswordResetLocally(email: string): {
  found: boolean;
  success: boolean;
  message: string;
  user?: CustomerUser;
  resetLink?: string;
} {
  const cleanEmail = email.trim().toLowerCase();
  const current = getLocalCustomers();
  const target = current.find((c) => c.email.trim().toLowerCase() === cleanEmail);
  if (!target) {
    return {
      found: false,
      success: false,
      message: 'Alamat email tidak ditemukan dalam daftar pelanggan.',
    };
  }

  const resetToken = `RST-${Math.floor(100000 + Math.random() * 900000)}`;
  const nowIso = new Date().toISOString();
  const updatedUser: CustomerUser = {
    ...target,
    status: 'pending',
    passwordResetRequested: true,
    resetRequestedAt: nowIso,
    resetToken,
  };

  const updatedList = current.map((c) => (c.id === target.id ? updatedUser : c));
  saveLocalCustomers(updatedList);
  syncToGoogleSheets('update_status', {
    id: target.id,
    status: 'pending',
    passwordResetRequested: true,
    resetToken,
  });

  const resetLink = `${window.location.origin}/?reset_token=${resetToken}&email=${encodeURIComponent(target.email)}`;
  return {
    found: true,
    success: true,
    message: 'Tautan pemulihan kata sandi berhasil dibuat.',
    user: updatedUser,
    resetLink,
  };
}

export function resetCustomerPasswordLocally(
  email: string,
  newPassword: string
): CustomerUser | null {
  const cleanEmail = email.trim().toLowerCase();
  const current = getLocalCustomers();
  let updatedUser: CustomerUser | null = null;

  const updatedList = current.map((c) => {
    if (c.email.trim().toLowerCase() === cleanEmail) {
      updatedUser = {
        ...c,
        status: 'active',
        passwordResetRequested: false,
        resetToken: undefined,
        ...(newPassword ? ({ customPassword: newPassword } as any) : {}),
      };
      return updatedUser;
    }
    return c;
  });

  if (updatedUser) {
    saveLocalCustomers(updatedList);
    syncToGoogleSheets('update_status', { id: (updatedUser as CustomerUser).id, status: 'active' });
  }
  return updatedUser;
}

export function updateLocalPaymentStatus(
  userId: string,
  paymentId: string,
  status: 'unpaid' | 'pending_verification' | 'paid',
  txId?: string
): CustomerUser[] {
  markLocalMutation();
  const current = getLocalCustomers();
  const transactionId = txId || (status === 'paid' ? `TX-${Math.floor(88001000 + Math.random() * 9000)}` : undefined);

  const updated = current.map((c) => {
    if (c.id !== userId) return c;
    const payments = (c.payments || []).map((p): PaymentRecord => {
      if (p.id !== paymentId) return p;
      return {
        ...p,
        status,
        transactionId: transactionId || p.transactionId,
      };
    });
    const newCustomerStatus = status === 'paid' && c.status === 'pending' ? 'active' : c.status;
    return { ...c, status: newCustomerStatus, payments };
  });

  saveLocalCustomers(updated);
  syncToGoogleSheets('verify_payment', { userId, paymentId, status, transactionId });
  broadcastDataUpdate('customers');
  return updated;
}

export function submitLocalPaymentProof(
  userId: string,
  paymentId: string,
  proofUrl: string,
  method = 'Transfer Bank'
): CustomerUser | null {
  markLocalMutation();
  const current = getLocalCustomers();
  let targetUser: CustomerUser | null = null;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const updated = current.map((c) => {
    if (c.id !== userId) return c;
    const payments = (c.payments || []).map((p): PaymentRecord => {
      if (p.id !== paymentId) return p;
      return {
        ...p,
        status: 'pending_verification',
        proofOfPaymentUrl: proofUrl,
        method,
        date: nowStr,
      };
    });
    targetUser = { ...c, payments };
    return targetUser;
  });

  saveLocalCustomers(updated);

  syncToGoogleSheets('submit_payment_proof', {
    userId,
    paymentId,
    customerName: targetUser ? (targetUser as CustomerUser).name : '',
    proofBase64: proofUrl,
    method,
    date: nowStr,
  }).then((res) => {
    if (res && res.driveProofUrl) {
      const latest = getLocalCustomers().map((c) => {
        if (c.id !== userId) return c;
        return {
          ...c,
          payments: (c.payments || []).map((p) =>
            p.id === paymentId ? { ...p, proofOfPaymentUrl: res.driveProofUrl } : p
          ),
        };
      });
      saveLocalCustomers(latest);
    }
  });

  broadcastDataUpdate('customers');
  return targetUser;
}

export function submitLocalQrisPayment(
  userId: string,
  paymentId: string,
  autoApprove = true
): CustomerUser | null {
  markLocalMutation();
  const current = getLocalCustomers();
  let targetUser: CustomerUser | null = null;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const txId = `QRIS-${Math.floor(100000 + Math.random() * 900000)}`;
  const newPaymentStatus: 'paid' | 'pending_verification' = autoApprove ? 'paid' : 'pending_verification';

  const updated = current.map((c) => {
    if (c.id !== userId) return c;
    const payments = (c.payments || []).map((p): PaymentRecord => {
      if (p.id !== paymentId) return p;
      return {
        ...p,
        status: newPaymentStatus,
        method: 'QRIS',
        transactionId: txId,
        date: nowStr,
      };
    });
    const newCustomerStatus = autoApprove && c.status === 'pending' ? 'active' : c.status;
    targetUser = { ...c, status: newCustomerStatus, payments };
    return targetUser;
  });

  saveLocalCustomers(updated);

  syncToGoogleSheets('qris_payment', {
    userId,
    paymentId,
    customerName: targetUser ? (targetUser as CustomerUser).name : '',
    method: 'QRIS',
    status: newPaymentStatus,
    transactionId: txId,
    date: nowStr,
  });

  broadcastDataUpdate('customers');
  return targetUser;
}

export function authenticateLocally(
  email: string,
  password: string,
  isAdmin: boolean
): { ok: boolean; success: boolean; user?: any; message?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (isAdmin) {
    const validAdminEmails = [
      'admin@patasnet.id',
      'admin@patas.net',
      'admin@taranet.id',
      'admin',
      'admin@gmail.com',
    ];
    const validAdminPasswords = [
      'admin',
      'admin123',
      'admin@patasnet.id',
      'patasnet',
      'patasnet123',
      '123456',
    ];
    if (
      validAdminEmails.includes(cleanEmail) &&
      (validAdminPasswords.includes(cleanPass) || validAdminPasswords.includes(password))
    ) {
      return {
        ok: true,
        success: true,
        user: { isAdmin: true, email: cleanEmail, name: 'Administrator Patas Net' },
      };
    }
    return {
      ok: false,
      success: false,
      message: 'Kredensial Admin tidak valid. Gunakan email: admin@patasnet.id dan password: admin',
    };
  }

  const customers = getLocalCustomers();
  const customer = customers.find(
    (c) =>
      c.email.trim().toLowerCase() === cleanEmail ||
      c.id.trim().toLowerCase() === cleanEmail ||
      c.phone.replace(/\D/g, '') === cleanEmail.replace(/\D/g, '')
  );
  if (!customer) {
    return {
      ok: false,
      success: false,
      message: 'Alamat email pelanggan tidak ditemukan. Gunakan budi@gmail.com (password: user123) untuk demo.',
    };
  }

  const customPass = (customer as any).customPassword;
  if (customPass && (password === customPass || cleanPass === customPass)) {
    return { ok: true, success: true, user: customer };
  }

  const validPasswords = ['user123', 'budi123', 'dewi123', 'andi123', 'admin', '123456'];
  if (validPasswords.includes(cleanPass) || cleanPass.length >= 4) {
    return { ok: true, success: true, user: customer };
  }

  return { ok: false, success: false, message: 'Password yang Anda masukkan salah.' };
}
