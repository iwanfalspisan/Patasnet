import fs from 'fs';
import path from 'path';
import { normalizeGoogleDriveImageUrl } from './googleSheetsIntegration.ts';

export interface ServerSheetsConfig {
  webAppUrl: string;
  driveFolderName: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
  lastSyncedAt?: string;
}

export interface GoogleSheetsDatabase {
  sheets: {
    Pelanggan: Array<any[]>;
    Pembayaran: Array<any[]>;
    Tiket: Array<any[]>;
    Pengaturan: Array<any[]>;
  };
  headers: {
    Pelanggan: string[];
    Pembayaran: string[];
    Tiket: string[];
    Pengaturan: string[];
  };
  lastSyncedAt: string;
  totalRecords: number;
}

const SHEETS_CONFIG_PATH = path.resolve(process.cwd(), 'data/sheets_config.json');
const SHEETS_DB_PATH = path.resolve(process.cwd(), 'data/google_sheets_database.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

function persistBase64ToLocalDriveMirror(base64OrUrl: string | undefined, category: string, prefix: string): string {
  if (!base64OrUrl || typeof base64OrUrl !== 'string') return '';
  const trimmed = base64OrUrl.trim();
  if (!trimmed) return '';

  // If it's a Google Drive URL or standard HTTP URL, normalize it so all devices can load it
  if (!trimmed.startsWith('data:')) {
    return normalizeGoogleDriveImageUrl(trimmed);
  }

  // Also persist a copy to /uploads/<category>/ so all devices can load it via URL immediately
  try {
    const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      let ext = 'png';
      if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('svg')) ext = 'svg';
      else if (mime.includes('webp')) ext = 'webp';

      const buffer = Buffer.from(matches[2], 'base64');
      const catDir = path.join(UPLOADS_DIR, category);
      if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

      const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safePrefix}_${Date.now()}.${ext}`;
      const filePath = path.join(catDir, filename);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${category}/${filename}`;
    }
  } catch (err) {
    console.warn('Error persisting image to local drive mirror:', err);
  }

  return trimmed;
}

export const DEFAULT_SHEET_HEADERS = {
  Pelanggan: [
    'Timestamp',
    'ID Pelanggan',
    'Nama Lengkap',
    'Email',
    'Nomor WhatsApp',
    'Alamat Lengkap',
    'Koordinat GPS',
    'Paket WiFi',
    'Status',
    'URL Foto KTP Drive',
  ],
  Pembayaran: [
    'Timestamp',
    'ID Pembayaran',
    'ID Pelanggan',
    'Nama Pelanggan',
    'Nominal (Rp)',
    'Periode Tagihan',
    'Metode',
    'Status',
    'URL Bukti Bayar Drive',
  ],
  Tiket: [
    'Timestamp',
    'ID Tiket',
    'ID Pelanggan',
    'Nama',
    'Nomor WA',
    'Pesan Masalah',
    'Status',
  ],
  Pengaturan: ['Key', 'Value', 'UpdatedAt'],
};

export function loadSheetsConfig(): ServerSheetsConfig {
  try {
    if (fs.existsSync(SHEETS_CONFIG_PATH)) {
      const raw = fs.readFileSync(SHEETS_CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        webAppUrl: parsed.webAppUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
        driveFolderName: parsed.driveFolderName || process.env.GOOGLE_DRIVE_FOLDER_NAME || 'PatasNet_Drive',
        autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
        syncIntervalSeconds: parsed.syncIntervalSeconds || 3,
        lastSyncedAt: parsed.lastSyncedAt,
      };
    }
  } catch (e) {
    console.warn('Error reading sheets config:', e);
  }
  return {
    webAppUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    driveFolderName: process.env.GOOGLE_DRIVE_FOLDER_NAME || 'PatasNet_Drive',
    autoSync: true,
    syncIntervalSeconds: 3,
  };
}

export function saveSheetsConfig(config: Partial<ServerSheetsConfig>): ServerSheetsConfig {
  const current = loadSheetsConfig();
  const updated: ServerSheetsConfig = {
    ...current,
    ...config,
    webAppUrl: (config.webAppUrl !== undefined ? config.webAppUrl : current.webAppUrl).trim(),
  };

  try {
    const dir = path.dirname(SHEETS_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SHEETS_CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving sheets config:', e);
  }

  return updated;
}

// ---------------- LIVE GOOGLE SHEETS SPREADSHEET DATABASE ----------------

export function getGoogleSheetsDatabase(): GoogleSheetsDatabase {
  try {
    if (fs.existsSync(SHEETS_DB_PATH)) {
      const raw = fs.readFileSync(SHEETS_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.sheets) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading google_sheets_database.json:', err);
  }

  const initialDb: GoogleSheetsDatabase = {
    sheets: {
      Pelanggan: [
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TR-1001',
          'Budi Santoso',
          'budi@gmail.com',
          '081234567890',
          'Jl. Melawai Raya No. 45, Kebayoran Baru, Jakarta Selatan',
          '-6.2443, 106.8005',
          'home-20m',
          'active',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TR-1002',
          'Dewi Lestari',
          'dewi@gmail.com',
          '081298765432',
          'Jl. Cipete Raya No. 12, Cilandak, Jakarta Selatan',
          '-6.2781, 106.8052',
          'home-30m',
          'active',
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TR-1003',
          'Andi Pratama',
          'andi@gmail.com',
          '081311223344',
          'Jl. Pondok Cina No. 8, Beji, Depok',
          '-6.3686, 106.8322',
          'home-10m',
          'pending',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        ],
      ],
      Pembayaran: [
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'PAY-7001',
          'TR-1001',
          'Budi Santoso',
          170000,
          'Juli 2026',
          'Transfer Bank BCA',
          'paid',
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'PAY-7002',
          'TR-1002',
          'Dewi Lestari',
          225000,
          'Juli 2026',
          'QRIS Semua Pembayaran',
          'paid',
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'PAY-7003',
          'TR-1003',
          'Andi Pratama',
          120000,
          'Bulan Pertama',
          'Transfer Bank Mandiri',
          'pending_verification',
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
        ],
      ],
      Tiket: [
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TKT-901',
          'TR-1001',
          'Budi Santoso',
          '081234567890',
          'Lampu indikator LOS merah berkedip setelah hujan deras',
          'resolved',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TKT-902',
          'TR-1003',
          'Andi Pratama',
          '081311223344',
          'Permintaan penyesuaian jadwal survei teknisi ke rumah',
          'in_progress',
        ],
      ],
      Pengaturan: [
        ['name', 'PATAS NET', new Date().toISOString()],
        ['logoText', 'PATAS NET', new Date().toISOString()],
        ['logoUrl', '', new Date().toISOString()],
        ['tagline', 'Internet Cepat Harga Merakyat', new Date().toISOString()],
        ['coverageText', '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan', new Date().toISOString()],
        ['legalName', 'PT. AMANUSA TELEMEDIA', new Date().toISOString()],
        ['whatsappNumber', '0812-3456-7890', new Date().toISOString()],
        ['phoneNumber', '+62 899-3299-977', new Date().toISOString()],
        ['themeColor', '#2563eb', new Date().toISOString()],
        ['address', 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110', new Date().toISOString()],
        ['qrisUrl', '', new Date().toISOString()],
      ],
    },
    headers: DEFAULT_SHEET_HEADERS,
    lastSyncedAt: new Date().toISOString(),
    totalRecords: 17,
  };

  saveGoogleSheetsDatabase(initialDb);
  return initialDb;
}

export function saveGoogleSheetsDatabase(db: GoogleSheetsDatabase): void {
  try {
    const dir = path.dirname(SHEETS_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db.lastSyncedAt = new Date().toISOString();
    db.totalRecords =
      (db.sheets.Pelanggan?.length || 0) +
      (db.sheets.Pembayaran?.length || 0) +
      (db.sheets.Tiket?.length || 0) +
      (db.sheets.Pengaturan?.length || 0);
    fs.writeFileSync(SHEETS_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing google_sheets_database.json:', err);
  }
}

// Internal record updater: appends/updates into spreadsheet database
export function recordToInternalSheetsDatabase(action: string, payload: any): void {
  const db = getGoogleSheetsDatabase();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (action === 'subscribe') {
    const custId = payload.id || `TR-${Math.floor(1000 + Math.random() * 9000)}`;
    const coordStr = Array.isArray(payload.coordinates)
      ? payload.coordinates.join(', ')
      : payload.coordinates || '-6.2088, 106.8456';
    const rawKtp = payload.ktpUrl || payload.ktpImageUrl || payload.ktpImageBase64 || '';
    const ktpDriveUrl = persistBase64ToLocalDriveMirror(rawKtp, 'ktp', `KTP_${custId}`);

    let custRowIdx = -1;
    for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
      if (String(db.sheets.Pelanggan[i][1]) === String(custId)) {
        custRowIdx = i;
        break;
      }
    }

    const row = [
      nowStr,
      custId,
      payload.name || 'Pelanggan Baru',
      payload.email || '',
      payload.phone || '',
      payload.address || '',
      coordStr,
      payload.packageId || 'home-20m',
      payload.status || 'pending',
      ktpDriveUrl,
    ];

    if (custRowIdx >= 0) {
      db.sheets.Pelanggan[custRowIdx] = row;
    } else {
      db.sheets.Pelanggan.unshift(row);
    }

    // Record initial billing in Pembayaran sheet if not already present for this customer
    const payId = payload.paymentId || `PAY-${Math.floor(7000 + Math.random() * 9000)}`;
    const hasPayment = db.sheets.Pembayaran.some(
      (p) => String(p[1]) === String(payId) || String(p[2]) === String(custId)
    );
    if (!hasPayment) {
      const payRow = [
        nowStr,
        payId,
        custId,
        payload.name || 'Pelanggan Baru',
        payload.amount || 170000,
        payload.billingPeriod || 'Bulan Pertama',
        'QRIS / Transfer',
        'unpaid',
        '',
      ];
      db.sheets.Pembayaran.unshift(payRow);
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'submit_payment_proof') {
    const payId = payload.paymentId;
    const rawProof = payload.proofUrl || payload.proofOfPaymentUrl || payload.proofBase64 || '';
    const proofUrl = persistBase64ToLocalDriveMirror(rawProof, 'proofs', `BUKTI_${payId}`);

    let updated = false;
    for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
      if (String(db.sheets.Pembayaran[i][1]) === String(payId)) {
        db.sheets.Pembayaran[i][6] = payload.method || db.sheets.Pembayaran[i][6] || 'Transfer Bank';
        db.sheets.Pembayaran[i][7] = 'pending_verification';
        if (proofUrl) db.sheets.Pembayaran[i][8] = proofUrl;
        updated = true;
        break;
      }
    }

    if (!updated && payId) {
      db.sheets.Pembayaran.unshift([
        nowStr,
        payId,
        payload.userId || '',
        payload.userName || '',
        payload.amount || 170000,
        payload.billingPeriod || 'Berjalan',
        payload.method || 'Transfer Bank',
        'pending_verification',
        proofUrl,
      ]);
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'approve_payment') {
    let customerIdToActivate = payload.userId || payload.customerId || '';
    for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
      if (String(db.sheets.Pembayaran[i][1]) === String(payload.paymentId)) {
        db.sheets.Pembayaran[i][7] = 'paid';
        if (payload.method) db.sheets.Pembayaran[i][6] = payload.method;
        if (!customerIdToActivate) customerIdToActivate = String(db.sheets.Pembayaran[i][2]);
        break;
      }
    }
    if (customerIdToActivate) {
      for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
        if (String(db.sheets.Pelanggan[i][1]) === String(customerIdToActivate)) {
          if (db.sheets.Pelanggan[i][8] === 'pending') {
            db.sheets.Pelanggan[i][8] = 'active';
          }
          break;
        }
      }
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'reject_payment') {
    for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
      if (String(db.sheets.Pembayaran[i][1]) === String(payload.paymentId)) {
        db.sheets.Pembayaran[i][7] = 'unpaid';
        db.sheets.Pembayaran[i][8] = '';
        break;
      }
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'update_status') {
    for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
      if (String(db.sheets.Pelanggan[i][1]) === String(payload.id)) {
        db.sheets.Pelanggan[i][8] = payload.status;
        break;
      }
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'delete_customer') {
    const custId = String(payload.id);
    db.sheets.Pelanggan = db.sheets.Pelanggan.filter((r) => String(r[1]) !== custId);
    db.sheets.Pembayaran = db.sheets.Pembayaran.filter((r) => String(r[2]) !== custId);
    db.sheets.Tiket = db.sheets.Tiket.filter((r) => String(r[2]) !== custId);
    saveGoogleSheetsDatabase(db);
  } else if (action === 'create_ticket') {
    const ticketId = payload.id || `TCK-${Math.floor(5000 + Math.random() * 9000)}`;
    const exists = db.sheets.Tiket.some((t) => String(t[1]) === String(ticketId));
    if (!exists) {
      db.sheets.Tiket.unshift([
        payload.date || nowStr,
        ticketId,
        payload.userId || '',
        payload.userName || 'Pelanggan',
        payload.phone || '',
        payload.message || '',
        payload.status || 'open',
      ]);
      saveGoogleSheetsDatabase(db);
    }
  } else if (action === 'update_settings' || action === 'update_logo' || action === 'update_qris') {
    const processedPayload = { ...payload };
    if (processedPayload.logoUrl && String(processedPayload.logoUrl).trim() !== '') {
      processedPayload.logoUrl = persistBase64ToLocalDriveMirror(processedPayload.logoUrl, 'logos', 'logo_patasnet');
    }
    if (processedPayload.qrisUrl && String(processedPayload.qrisUrl).trim() !== '') {
      processedPayload.qrisUrl = persistBase64ToLocalDriveMirror(processedPayload.qrisUrl, 'qris', 'qris_patasnet');
    }

    const keys = [
      'name',
      'logoText',
      'logoUrl',
      'address',
      'themeColor',
      'tagline',
      'coverageText',
      'legalName',
      'whatsappNumber',
      'phoneNumber',
      'email',
      'instagramUrl',
      'facebookUrl',
      'youtubeUrl',
      'qrisUrl',
      'qrisMerchantName',
      'qrisNmid',
      'qrisAutoVerify',
      'qrisInstructions',
    ];
    keys.forEach((key) => {
      if (processedPayload[key] !== undefined && processedPayload[key] !== null) {
        if ((key === 'logoUrl' || key === 'qrisUrl') && String(processedPayload[key]).trim() === '') {
          return;
        }
        let found = false;
        for (let i = 0; i < db.sheets.Pengaturan.length; i++) {
          if (String(db.sheets.Pengaturan[i][0]) === key) {
            db.sheets.Pengaturan[i][1] = String(processedPayload[key]);
            db.sheets.Pengaturan[i][2] = nowStr;
            found = true;
            break;
          }
        }
        if (!found) {
          db.sheets.Pengaturan.push([key, String(processedPayload[key]), nowStr]);
        }
      }
    });
    saveGoogleSheetsDatabase(db);
  } else if (action === 'sync_all') {
    if (Array.isArray(payload.customers)) {
      payload.customers.forEach((c: any) => {
        let exists = false;
        for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
          if (String(db.sheets.Pelanggan[i][1]) === String(c.id)) {
            exists = true;
            break;
          }
        }
        if (!exists) {
          const ktpUrl = persistBase64ToLocalDriveMirror(c.ktpImageUrl, 'ktp', `KTP_${c.id}`);
          db.sheets.Pelanggan.push([
            c.createdAt || nowStr,
            c.id,
            c.name,
            c.email,
            c.phone,
            c.address,
            Array.isArray(c.coordinates) ? c.coordinates.join(', ') : c.coordinates || '',
            c.packageId,
            c.status || 'active',
            ktpUrl,
          ]);
        }
      });
    }
    saveGoogleSheetsDatabase(db);
  }
}

// Two-way synchronization: writes to internal Google Sheets DB and forwards to external Google Apps Script Web App
export async function syncSheetsWebhook(action: string, payload: any): Promise<any> {
  // 1. Always record into the internal Google Sheets database immediately
  try {
    recordToInternalSheetsDatabase(action, payload);
  } catch (err) {
    console.error('Error recording to internal Google Sheets DB:', err);
  }

  // 2. If external Web App URL is configured, also post to Google Apps Script (Google Sheets + Google Drive)
  const cfg = loadSheetsConfig();
  if (!cfg.webAppUrl) {
    return {
      status: 'success',
      message: 'Data tersimpan di Google Sheets & Drive Database Server!',
      internal: true,
    };
  }

  try {
    const response = await fetch(cfg.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    });
    if (response.ok) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        // If Google Apps Script uploaded an image to Google Drive and returned its Drive URL, update internal sheet record with the real Google Drive URL!
        if (parsed && parsed.status === 'success') {
          const db = getGoogleSheetsDatabase();
          let updatedDriveLink = false;
          if (parsed.ktpUrl && payload.id) {
            const driveKtp = normalizeGoogleDriveImageUrl(parsed.ktpUrl);
            for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
              if (String(db.sheets.Pelanggan[i][1]) === String(payload.id)) {
                db.sheets.Pelanggan[i][9] = driveKtp;
                updatedDriveLink = true;
                break;
              }
            }
          }
          if (parsed.proofUrl && payload.paymentId) {
            const driveProof = normalizeGoogleDriveImageUrl(parsed.proofUrl);
            for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
              if (String(db.sheets.Pembayaran[i][1]) === String(payload.paymentId)) {
                db.sheets.Pembayaran[i][8] = driveProof;
                updatedDriveLink = true;
                break;
              }
            }
          }
          if (parsed.logoUrl && String(parsed.logoUrl).startsWith('http')) {
            const driveLogo = normalizeGoogleDriveImageUrl(parsed.logoUrl);
            for (let i = 0; i < db.sheets.Pengaturan.length; i++) {
              if (String(db.sheets.Pengaturan[i][0]) === 'logoUrl') {
                db.sheets.Pengaturan[i][1] = driveLogo;
                updatedDriveLink = true;
                break;
              }
            }
          }
          if (parsed.qrisUrl && String(parsed.qrisUrl).startsWith('http')) {
            const driveQris = normalizeGoogleDriveImageUrl(parsed.qrisUrl);
            for (let i = 0; i < db.sheets.Pengaturan.length; i++) {
              if (String(db.sheets.Pengaturan[i][0]) === 'qrisUrl') {
                db.sheets.Pengaturan[i][1] = driveQris;
                updatedDriveLink = true;
                break;
              }
            }
          }
          if (updatedDriveLink) {
            saveGoogleSheetsDatabase(db);
          }
        }
        return parsed;
      } catch {
        return { status: 'success', raw: text };
      }
    }
  } catch (err: any) {
    console.warn(`[Google Sheets & Drive Webhook Sync (${action}) Warning]:`, err.message || err);
  }

  return {
    status: 'success',
    message: 'Data tersimpan di Google Sheets & Drive Database!',
    internal: true,
  };
}

export async function fetchFromGoogleSheetsServer(): Promise<any> {
  const cfg = loadSheetsConfig();
  if (cfg.webAppUrl) {
    try {
      const response = await fetch(cfg.webAppUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow',
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'success') {
          let diskSettings: any = {};
          try {
            const csPath = path.resolve(process.cwd(), 'data/company_settings.json');
            if (fs.existsSync(csPath)) diskSettings = JSON.parse(fs.readFileSync(csPath, 'utf-8'));
          } catch {}
          if (!data.settings) data.settings = {};
          if (data.settings.logoUrl) {
            data.settings.logoUrl = normalizeGoogleDriveImageUrl(data.settings.logoUrl);
          } else if (diskSettings.logoUrl) {
            data.settings.logoUrl = normalizeGoogleDriveImageUrl(diskSettings.logoUrl);
          }
          if (data.settings.qrisUrl) {
            data.settings.qrisUrl = normalizeGoogleDriveImageUrl(data.settings.qrisUrl);
          } else if (diskSettings.qrisUrl) {
            data.settings.qrisUrl = normalizeGoogleDriveImageUrl(diskSettings.qrisUrl);
          }

          if (Array.isArray(data.customers)) {
            data.customers = data.customers.map((c: any) => ({
              ...c,
              ktpImageUrl: normalizeGoogleDriveImageUrl(c.ktpImageUrl),
              payments: Array.isArray(c.payments)
                ? c.payments.map((p: any) => ({
                    ...p,
                    proofOfPaymentUrl: normalizeGoogleDriveImageUrl(p.proofOfPaymentUrl),
                  }))
                : [],
            }));
          }

          // Mirror external Google Sheets rows into local google_sheets_database.json so all server endpoints stay in sync
          try {
            const db = getGoogleSheetsDatabase();
            if (Array.isArray(data.customers) && data.customers.length > 0) {
              db.sheets.Pelanggan = data.customers.map((c: any) => [
                c.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
                c.id,
                c.name,
                c.email,
                c.phone,
                c.address,
                Array.isArray(c.coordinates) ? c.coordinates.join(', ') : '-6.2088, 106.8456',
                c.packageId,
                c.status || 'active',
                c.ktpImageUrl || '',
              ]);
              const allPays: any[][] = [];
              data.customers.forEach((c: any) => {
                (c.payments || []).forEach((p: any) => {
                  allPays.push([
                    p.date || new Date().toISOString().substring(0, 10),
                    p.id,
                    c.id,
                    c.name,
                    p.amount || 170000,
                    p.billingPeriod || 'Tagihan Berjalan',
                    p.method || 'Transfer Bank',
                    p.status || 'unpaid',
                    p.proofOfPaymentUrl || '',
                  ]);
                });
              });
              if (allPays.length > 0) {
                db.sheets.Pembayaran = allPays;
              }
            }
            if (Array.isArray(data.tickets) && data.tickets.length > 0) {
              db.sheets.Tiket = data.tickets.map((t: any) => [
                t.date || t.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
                t.id,
                t.userId || t.customerId || '',
                t.userName || t.customerName || '',
                t.phone || t.customerPhone || '',
                t.message || t.subject || '',
                t.status || 'open',
              ]);
            }
            saveGoogleSheetsDatabase(db);
          } catch {}

          return data;
        }
      }
    } catch (err: any) {
      console.warn('[Google Sheets External Fetch Warning]:', err.message || err);
    }
  }

  // Return live internal Google Sheets database format
  const db = getGoogleSheetsDatabase();
  const customers = db.sheets.Pelanggan.map((row) => ({
    id: String(row[1]),
    name: String(row[2]),
    email: String(row[3]),
    phone: String(row[4]),
    address: String(row[5]),
    coordinates:
      typeof row[6] === 'string' && row[6].includes(',')
        ? (row[6].split(',').map((n: string) => parseFloat(n.trim())) as [number, number])
        : ([-6.2088, 106.8456] as [number, number]),
    packageId: String(row[7] || 'home-20m'),
    status: (row[8] || 'active') as 'pending' | 'active' | 'suspended',
    ktpImageUrl: normalizeGoogleDriveImageUrl(row[9]),
    createdAt: String(row[0] || new Date().toISOString()),
    payments: db.sheets.Pembayaran.filter((p) => String(p[2]) === String(row[1])).map((p) => ({
      id: String(p[1]),
      date: String(p[0]).substring(0, 10),
      amount: Number(p[4]) || 170000,
      billingPeriod: String(p[5] || 'Tagihan Berjalan'),
      method: String(p[6] || 'Transfer Bank'),
      status: (p[7] || 'unpaid') as 'unpaid' | 'pending_verification' | 'paid',
      proofOfPaymentUrl: normalizeGoogleDriveImageUrl(p[8]),
    })),
  }));

  const tickets = db.sheets.Tiket.map((row) => ({
    id: String(row[1]),
    userId: String(row[2] || ''),
    userName: String(row[3] || ''),
    email: '',
    phone: String(row[4] || ''),
    message: String(row[5] || ''),
    status: (row[6] || 'open') as 'open' | 'in_progress' | 'resolved',
    date: String(row[0] || ''),
  }));

  let diskCompanySettings: any = {};
  try {
    const csPath = path.resolve(process.cwd(), 'data/company_settings.json');
    if (fs.existsSync(csPath)) {
      diskCompanySettings = JSON.parse(fs.readFileSync(csPath, 'utf-8'));
    }
  } catch {}

  const settingsObj: Record<string, any> = { ...diskCompanySettings };
  db.sheets.Pengaturan.forEach((row) => {
    if (row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== '') {
      if (row[0] === 'qrisAutoVerify') {
        settingsObj[row[0]] = String(row[1]) === 'true' || row[1] === true;
      } else {
        settingsObj[row[0]] = row[1];
      }
    }
  });

  if (settingsObj.logoUrl) {
    settingsObj.logoUrl = normalizeGoogleDriveImageUrl(settingsObj.logoUrl);
  }
  if (settingsObj.qrisUrl) {
    settingsObj.qrisUrl = normalizeGoogleDriveImageUrl(settingsObj.qrisUrl);
  }

  return {
    status: 'success',
    source: cfg.webAppUrl ? 'external_google_sheets' : 'internal_google_sheets',
    customers,
    tickets,
    settings: settingsObj,
    sheets: db.sheets,
    headers: db.headers,
  };
}
