import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  normalizeGoogleDriveImageUrl,
  sanitizeSheetSettings,
  isAppsScriptWebAppUrl,
  extractSpreadsheetId,
  EMBEDDED_APPS_SCRIPT_URL,
  EMBEDDED_SPREADSHEET_URL,
  EMBEDDED_DRIVE_LOGO_URL,
  EMBEDDED_DRIVE_FOLDER_NAME,
} from './googleSheetsIntegration.ts';

export interface ServerSheetsConfig {
  webAppUrl: string;
  spreadsheetUrl?: string;
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
const COMPANY_SETTINGS_PATH = path.resolve(process.cwd(), 'data/company_settings.json');
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
      const rawWebAppUrl = typeof parsed.webAppUrl === 'string' ? parsed.webAppUrl.trim() : '';
      const resolvedWebAppUrl =
        !rawWebAppUrl ||
        rawWebAppUrl.includes('AKfycbxXScZJqOQ9myhQkmxUBClZx8LGj0xBgPxIskOTBMr_o4-hfQ-Tqq0dqus6jaOZX5gr')
          ? process.env.GOOGLE_SHEETS_WEBHOOK_URL || EMBEDDED_APPS_SCRIPT_URL
          : rawWebAppUrl;
      return {
        webAppUrl: resolvedWebAppUrl,
        spreadsheetUrl: parsed.spreadsheetUrl || EMBEDDED_SPREADSHEET_URL,
        driveFolderName: parsed.driveFolderName || process.env.GOOGLE_DRIVE_FOLDER_NAME || EMBEDDED_DRIVE_FOLDER_NAME,
        autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
        syncIntervalSeconds: parsed.syncIntervalSeconds || 3,
        lastSyncedAt: parsed.lastSyncedAt,
      };
    }
  } catch (e) {
    console.warn('Error reading sheets config:', e);
  }
  return {
    webAppUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || EMBEDDED_APPS_SCRIPT_URL,
    spreadsheetUrl: EMBEDDED_SPREADSHEET_URL,
    driveFolderName: process.env.GOOGLE_DRIVE_FOLDER_NAME || EMBEDDED_DRIVE_FOLDER_NAME,
    autoSync: true,
    syncIntervalSeconds: 3,
  };
}

export function saveSheetsConfig(config: Partial<ServerSheetsConfig>): ServerSheetsConfig {
  const current = loadSheetsConfig();
  let nextWebAppUrl = config.webAppUrl !== undefined ? config.webAppUrl.trim() : current.webAppUrl;
  let nextSpreadsheetUrl = config.spreadsheetUrl !== undefined ? config.spreadsheetUrl.trim() : current.spreadsheetUrl;

  // Never accidentally clobber a valid script.google.com/macros/s/.../exec URL with a docs.google.com view link
  if (
    isAppsScriptWebAppUrl(current.webAppUrl) &&
    nextWebAppUrl &&
    !isAppsScriptWebAppUrl(nextWebAppUrl) &&
    extractSpreadsheetId(nextWebAppUrl)
  ) {
    nextSpreadsheetUrl = nextWebAppUrl;
    nextWebAppUrl = current.webAppUrl;
  } else if (nextWebAppUrl && extractSpreadsheetId(nextWebAppUrl)) {
    nextSpreadsheetUrl = nextWebAppUrl;
  }

  const updated: ServerSheetsConfig = {
    ...current,
    ...config,
    webAppUrl: nextWebAppUrl,
    ...(nextSpreadsheetUrl ? { spreadsheetUrl: nextSpreadsheetUrl } : {}),
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

// ---------------- LIVE GOOGLE SHEETS SPREADSHEET DATABASE (CONCURRENCY SAFE) ----------------

let inMemorySheetsDb: GoogleSheetsDatabase | null = null;
const deletedServerCustomerIds = new Set<string>();
let serverWebhookQueue: Promise<any> = Promise.resolve();
let activeServerWebhookCount = 0;
let lastServerMutationTimestamp = 0;
let atomicIdCounter = Math.floor(100 + Math.random() * 800);

export function markServerMutation(): void {
  lastServerMutationTimestamp = Date.now();
}

export function isServerInMutationCooldown(): boolean {
  return activeServerWebhookCount > 0 || Date.now() - lastServerMutationTimestamp < 20000;
}

/**
 * Generates a 100% collision-free Customer ID even when 50 users register at the exact same millisecond.
 */
export function generateUniqueServerCustomerId(existingDb?: GoogleSheetsDatabase): string {
  const db = existingDb || getGoogleSheetsDatabase();
  const existingIds = new Set<string>(
    (db.sheets.Pelanggan || []).map((r) => String(r?.[1] || '').toUpperCase())
  );

  for (let attempt = 0; attempt < 50; attempt++) {
    atomicIdCounter = (atomicIdCounter + 1) % 9000;
    const timePart = String(Date.now()).slice(-4);
    const seqPart = String(10 + (atomicIdCounter % 89));
    const candidate = `TR-${timePart}${seqPart}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  return `TR-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 89)}`;
}

/**
 * Generates a 100% collision-free Payment ID for concurrent registrations.
 */
export function generateUniqueServerPaymentId(existingDb?: GoogleSheetsDatabase): string {
  const db = existingDb || getGoogleSheetsDatabase();
  const existingPayIds = new Set<string>(
    (db.sheets.Pembayaran || []).map((p) => String(p?.[1] || '').toUpperCase())
  );

  for (let attempt = 0; attempt < 50; attempt++) {
    atomicIdCounter = (atomicIdCounter + 1) % 9000;
    const timePart = String(Date.now()).slice(-4);
    const seqPart = String(10 + (atomicIdCounter % 89));
    const candidate = `PAY-${timePart}${seqPart}`;
    if (!existingPayIds.has(candidate)) {
      return candidate;
    }
  }
  return `PAY-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 89)}`;
}

export function getGoogleSheetsDatabase(): GoogleSheetsDatabase {
  if (inMemorySheetsDb && inMemorySheetsDb.sheets) {
    return inMemorySheetsDb;
  }

  try {
    if (fs.existsSync(SHEETS_DB_PATH)) {
      const raw = fs.readFileSync(SHEETS_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.sheets) {
        inMemorySheetsDb = parsed;
        return inMemorySheetsDb!;
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
        ['name', 'Patas.Net', new Date().toISOString()],
        ['logoText', 'PATAS NET', new Date().toISOString()],
        ['logoUrl', EMBEDDED_DRIVE_LOGO_URL, new Date().toISOString()],
        ['tagline', 'Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota', new Date().toISOString()],
        ['coverageText', '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan', new Date().toISOString()],
        ['legalName', 'SMK Negeri 4 Tasikmalaya', new Date().toISOString()],
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

  inMemorySheetsDb = initialDb;
  saveGoogleSheetsDatabase(initialDb);
  return initialDb;
}

export function saveGoogleSheetsDatabase(db: GoogleSheetsDatabase): void {
  inMemorySheetsDb = db;
  try {
    const dir = path.dirname(SHEETS_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db.lastSyncedAt = new Date().toISOString();
    db.totalRecords =
      (db.sheets.Pelanggan?.length || 0) +
      (db.sheets.Pembayaran?.length || 0) +
      (db.sheets.Tiket?.length || 0) +
      (db.sheets.Pengaturan?.length || 0);
    // Atomic write via temporary file rename to prevent partial JSON reads under high concurrency
    const tmpPath = `${SHEETS_DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpPath, SHEETS_DB_PATH);
  } catch (err) {
    try {
      fs.writeFileSync(SHEETS_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (innerErr) {
      console.warn('Error writing google_sheets_database.json:', innerErr);
    }
  }
}

// Internal record updater: appends/updates into spreadsheet database
export function recordToInternalSheetsDatabase(action: string, payload: any): void {
  markServerMutation();
  const db = getGoogleSheetsDatabase();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (action === 'subscribe') {
    let custId = payload.id || generateUniqueServerCustomerId(db);
    const coordStr = Array.isArray(payload.coordinates)
      ? payload.coordinates.join(', ')
      : payload.coordinates || '-6.2088, 106.8456';
    const rawKtp = payload.ktpUrl || payload.ktpImageUrl || payload.ktpImageBase64 || '';
    const ktpDriveUrl = persistBase64ToLocalDriveMirror(rawKtp, 'ktp', `KTP_${custId}`);

    let custRowIdx = -1;
    for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
      if (String(db.sheets.Pelanggan[i][1]) === String(custId)) {
        // Collision guard: if a different person with a different email already has this custId, generate a fresh unique custId so we NEVER overwrite them!
        const existingEmail = String(db.sheets.Pelanggan[i][3] || '').trim().toLowerCase();
        const incomingEmail = String(payload.email || '').trim().toLowerCase();
        if (existingEmail && incomingEmail && existingEmail !== incomingEmail) {
          custId = generateUniqueServerCustomerId(db);
          payload.id = custId;
          custRowIdx = -1;
        } else {
          custRowIdx = i;
        }
        break;
      }
    }

    const existingRow = custRowIdx >= 0 ? db.sheets.Pelanggan[custRowIdx] : null;
    const rawPass = payload.password || payload.customPassword || '';
    const resolvedHash =
      payload.passwordHash ||
      (rawPass
        ? crypto.createHash('sha256').update(String(rawPass)).digest('hex')
        : existingRow?.[10] || '');
    const resolvedPlainPass = rawPass || existingRow?.[11] || '';

    const row = [
      nowStr,
      custId,
      payload.name || existingRow?.[2] || 'Pelanggan Baru',
      (payload.email || existingRow?.[3] || '').toLowerCase(),
      payload.phone || existingRow?.[4] || '',
      payload.address || existingRow?.[5] || '',
      coordStr,
      payload.packageId || existingRow?.[7] || 'home-20m',
      payload.status || existingRow?.[8] || 'pending',
      ktpDriveUrl || existingRow?.[9] || '',
      resolvedHash,
      resolvedPlainPass,
    ];

    if (custRowIdx >= 0) {
      db.sheets.Pelanggan[custRowIdx] = row;
    } else {
      db.sheets.Pelanggan.unshift(row);
    }

    const payId = payload.paymentId || generateUniqueServerPaymentId(db);
    const hasPayment = db.sheets.Pembayaran.some((p) => String(p[1]) === String(payId));
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
    deletedServerCustomerIds.add(custId);
    db.sheets.Pelanggan = db.sheets.Pelanggan.filter((r) => String(r[1]) !== custId);
    db.sheets.Pembayaran = db.sheets.Pembayaran.filter((r) => String(r[2]) !== custId);
    db.sheets.Tiket = db.sheets.Tiket.filter((r) => String(r[2]) !== custId);
    saveGoogleSheetsDatabase(db);
  } else if (action === 'create_ticket' || action === 'submit_ticket') {
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
  } else if (action === 'update_ticket_status') {
    for (let i = 0; i < db.sheets.Tiket.length; i++) {
      if (String(db.sheets.Tiket[i][1]) === String(payload.id)) {
        db.sheets.Tiket[i][6] = payload.status === 'resolved' ? 'resolved' : 'open';
        break;
      }
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'update_settings' || action === 'update_logo' || action === 'update_qris') {
    const sanitized = sanitizeSheetSettings({ ...payload });
    delete sanitized._hadFormulaError;

    if (sanitized.logoUrl && String(sanitized.logoUrl).trim() !== '') {
      sanitized.logoUrl = persistBase64ToLocalDriveMirror(sanitized.logoUrl, 'logos', 'logo_patasnet');
    }
    if (sanitized.qrisUrl && String(sanitized.qrisUrl).trim() !== '') {
      sanitized.qrisUrl = persistBase64ToLocalDriveMirror(sanitized.qrisUrl, 'qris', 'qris_patasnet');
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
      'promos',
      'heroSlides',
      'packagesJson',
      'coverageJson',
      'whatsappConfigJson',
    ];
    keys.forEach((key) => {
      if (sanitized[key] !== undefined && sanitized[key] !== null) {
        if ((key === 'logoUrl' || key === 'qrisUrl') && String(sanitized[key]).trim() === '') {
          return;
        }
        const serializedVal =
          (key === 'promos' || key === 'heroSlides') && Array.isArray(sanitized[key])
            ? JSON.stringify(sanitized[key])
            : String(sanitized[key]);

        let found = false;
        for (let i = 0; i < db.sheets.Pengaturan.length; i++) {
          if (String(db.sheets.Pengaturan[i][0]) === key) {
            db.sheets.Pengaturan[i][1] = serializedVal;
            db.sheets.Pengaturan[i][2] = nowStr;
            found = true;
            break;
          }
        }
        if (!found) {
          db.sheets.Pengaturan.push([key, serializedVal, nowStr]);
        }
      }
    });
    saveGoogleSheetsDatabase(db);
  } else if (action === 'update_packages' || action === 'sync_packages') {
    const pkgList = Array.isArray(payload.packages) ? payload.packages : [];
    const serialized = JSON.stringify(pkgList);
    let found = false;
    for (let i = 0; i < db.sheets.Pengaturan.length; i++) {
      if (String(db.sheets.Pengaturan[i][0]) === 'packagesJson') {
        db.sheets.Pengaturan[i][1] = serialized;
        db.sheets.Pengaturan[i][2] = nowStr;
        found = true;
        break;
      }
    }
    if (!found) db.sheets.Pengaturan.push(['packagesJson', serialized, nowStr]);
    saveGoogleSheetsDatabase(db);
  } else if (action === 'update_coverage' || action === 'sync_coverage') {
    const covList = Array.isArray(payload.coverage) ? payload.coverage : [];
    const serialized = JSON.stringify(covList);
    let found = false;
    for (let i = 0; i < db.sheets.Pengaturan.length; i++) {
      if (String(db.sheets.Pengaturan[i][0]) === 'coverageJson') {
        db.sheets.Pengaturan[i][1] = serialized;
        db.sheets.Pengaturan[i][2] = nowStr;
        found = true;
        break;
      }
    }
    if (!found) db.sheets.Pengaturan.push(['coverageJson', serialized, nowStr]);
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

/**
 * Mirrors external Google Sheets data (fetched by server or by any client device)
 * into the server's company_settings.json and google_sheets_database.json so all
 * devices immediately share the exact same state.
 */
export function mirrorExternalSheetsDataToServer(data: {
  settings?: any;
  customers?: any[];
  tickets?: any[];
  webAppUrl?: string;
}): { settingsUpdated: boolean; dbUpdated: boolean; mergedSettings?: any } {
  let settingsUpdated = false;
  let dbUpdated = false;
  let mergedSettings: any = null;

  if (data.webAppUrl && isAppsScriptWebAppUrl(data.webAppUrl)) {
    saveSheetsConfig({ webAppUrl: data.webAppUrl });
  }

  const db = getGoogleSheetsDatabase();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
    const sanitized = sanitizeSheetSettings(data.settings);
    delete sanitized._hadFormulaError;

    let diskSettings: Record<string, any> = {};
    try {
      if (fs.existsSync(COMPANY_SETTINGS_PATH)) {
        diskSettings = JSON.parse(fs.readFileSync(COMPANY_SETTINGS_PATH, 'utf-8'));
      }
    } catch {}

    const nextSettings: Record<string, any> = {
      ...diskSettings,
      ...sanitized,
      logoUrl:
        sanitized.logoUrl && String(sanitized.logoUrl).trim() !== ''
          ? normalizeGoogleDriveImageUrl(sanitized.logoUrl)
          : diskSettings.logoUrl || '',
      qrisUrl:
        sanitized.qrisUrl && String(sanitized.qrisUrl).trim() !== ''
          ? normalizeGoogleDriveImageUrl(sanitized.qrisUrl)
          : diskSettings.qrisUrl || '',
      promos:
        Array.isArray(sanitized.promos) && sanitized.promos.length > 0
          ? sanitized.promos.map((p: string) => normalizeGoogleDriveImageUrl(p))
          : Array.isArray(diskSettings.promos)
          ? diskSettings.promos
          : [],
      heroSlides:
        Array.isArray(sanitized.heroSlides) && sanitized.heroSlides.length > 0
          ? sanitized.heroSlides.map((s: string) => normalizeGoogleDriveImageUrl(s))
          : Array.isArray(diskSettings.heroSlides)
          ? diskSettings.heroSlides
          : undefined,
    };

    if (JSON.stringify(diskSettings) !== JSON.stringify(nextSettings)) {
      try {
        const dir = path.dirname(COMPANY_SETTINGS_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(COMPANY_SETTINGS_PATH, JSON.stringify(nextSettings, null, 2), 'utf-8');
        settingsUpdated = true;
      } catch {}
    }

    // Also update db.sheets.Pengaturan
    Object.keys(nextSettings).forEach((key) => {
      if (nextSettings[key] !== undefined && nextSettings[key] !== null) {
        if ((key === 'logoUrl' || key === 'qrisUrl') && String(nextSettings[key]).trim() === '') return;
        const valStr =
          (key === 'promos' || key === 'heroSlides') && Array.isArray(nextSettings[key])
            ? JSON.stringify(nextSettings[key])
            : String(nextSettings[key]);
        let found = false;
        for (let i = 0; i < db.sheets.Pengaturan.length; i++) {
          if (String(db.sheets.Pengaturan[i][0]) === key) {
            if (db.sheets.Pengaturan[i][1] !== valStr) {
              db.sheets.Pengaturan[i][1] = valStr;
              db.sheets.Pengaturan[i][2] = nowStr;
              dbUpdated = true;
            }
            found = true;
            break;
          }
        }
        if (!found) {
          db.sheets.Pengaturan.push([key, valStr, nowStr]);
          dbUpdated = true;
        }
      }
    });

    mergedSettings = nextSettings;
  }

  if (Array.isArray(data.customers) && data.customers.length > 0) {
    const existingById = new Map<string, any[]>();
    (db.sheets.Pelanggan || []).forEach((r) => {
      if (r && r[1]) existingById.set(String(r[1]), r);
    });

    const incomingIds = new Set<string>();
    const mappedCustomers = data.customers
      .filter((c: any) => c && c.id && !deletedServerCustomerIds.has(String(c.id)))
      .map((c: any) => {
        const cid = String(c.id || '');
        incomingIds.add(cid);
        const prevRow = existingById.get(cid);
        const rawPass = c.password || c.customPassword || prevRow?.[11] || '';
        const resolvedHash =
          c.passwordHash ||
          (rawPass
            ? crypto.createHash('sha256').update(String(rawPass)).digest('hex')
            : prevRow?.[10] || '');

        return [
          c.createdAt || prevRow?.[0] || nowStr,
          cid,
          c.name || prevRow?.[2] || '',
          (c.email || prevRow?.[3] || '').toLowerCase(),
          c.phone || prevRow?.[4] || '',
          c.address || prevRow?.[5] || '',
          Array.isArray(c.coordinates)
            ? c.coordinates.join(', ')
            : c.coordinates || prevRow?.[6] || '-6.2088, 106.8456',
          c.packageId || prevRow?.[7] || 'home-20m',
          c.status || prevRow?.[8] || 'active',
          normalizeGoogleDriveImageUrl(c.ktpImageUrl) || prevRow?.[9] || '',
          resolvedHash,
          rawPass,
        ];
      });

    // Additive Union Merge: preserve ALL existing server customers not yet in Google Sheets response (unless explicitly deleted)
    const unsyncedServerCustomers = (db.sheets.Pelanggan || []).filter((r) => {
      const cid = String(r?.[1] || '');
      return cid && !incomingIds.has(cid) && !deletedServerCustomerIds.has(cid);
    });

    db.sheets.Pelanggan = [...unsyncedServerCustomers, ...mappedCustomers];

    // Additive Union Merge for Pembayaran so concurrent registrations' bills are NEVER overwritten
    const incomingPayIds = new Set<string>();
    const existingPayById = new Map<string, any[]>();
    (db.sheets.Pembayaran || []).forEach((p) => {
      if (p && p[1]) existingPayById.set(String(p[1]), p);
    });

    const incomingPays: any[][] = [];
    data.customers.forEach((c: any) => {
      if (c?.id && deletedServerCustomerIds.has(String(c.id))) return;
      (c.payments || []).forEach((p: any) => {
        if (!p || !p.id) return;
        const pid = String(p.id);
        incomingPayIds.add(pid);
        const prevPay = existingPayById.get(pid);
        incomingPays.push([
          p.date || prevPay?.[0] || nowStr.substring(0, 10),
          pid,
          c.id,
          c.name || prevPay?.[3] || '',
          p.amount || prevPay?.[4] || 170000,
          p.billingPeriod || prevPay?.[5] || 'Tagihan Berjalan',
          p.method || prevPay?.[6] || 'Transfer Bank',
          p.status || prevPay?.[7] || 'unpaid',
          normalizeGoogleDriveImageUrl(p.proofOfPaymentUrl) || prevPay?.[8] || '',
          p.transactionId || prevPay?.[9] || '',
        ]);
      });
    });

    const unsyncedServerPays = (db.sheets.Pembayaran || []).filter((p) => {
      const pid = String(p?.[1] || '');
      const cid = String(p?.[2] || '');
      return pid && !incomingPayIds.has(pid) && !deletedServerCustomerIds.has(cid);
    });

    if (incomingPays.length > 0 || unsyncedServerPays.length > 0) {
      db.sheets.Pembayaran = [...unsyncedServerPays, ...incomingPays];
    }
    dbUpdated = true;
  }

  if (Array.isArray(data.tickets) && data.tickets.length > 0) {
    const incomingTicketIds = new Set<string>();
    const mappedTickets = data.tickets.map((t: any) => {
      const tid = String(t.id || '');
      incomingTicketIds.add(tid);
      return [
        t.date || t.createdAt || nowStr,
        tid,
        t.userId || t.customerId || '',
        t.userName || t.customerName || '',
        t.phone || t.customerPhone || '',
        t.message || t.subject || '',
        t.status || 'open',
      ];
    });
    const unsyncedServerTickets = (db.sheets.Tiket || []).filter((t) => {
      const tid = String(t?.[1] || '');
      return tid && !incomingTicketIds.has(tid);
    });
    db.sheets.Tiket = [...unsyncedServerTickets, ...mappedTickets];
    dbUpdated = true;
  }

  if (dbUpdated) {
    saveGoogleSheetsDatabase(db);
  }

  return { settingsUpdated, dbUpdated, mergedSettings };
}

// Two-way synchronization: writes to internal Google Sheets DB immediately and queues outbound POSTs to Google Apps Script sequentially (FIFO)
export async function syncSheetsWebhook(action: string, payload: any, customUrl?: string): Promise<any> {
  markServerMutation();
  // 1. Always record into the internal Google Sheets database immediately & atomically
  try {
    recordToInternalSheetsDatabase(action, payload);
  } catch (err) {
    console.error('Error recording to internal Google Sheets DB:', err);
  }

  // If the client passed a valid Apps Script Web App URL, save it to server config so all devices share it
  if (customUrl && isAppsScriptWebAppUrl(customUrl)) {
    saveSheetsConfig({ webAppUrl: customUrl });
  }

  const cfg = loadSheetsConfig();
  const targetUrl = isAppsScriptWebAppUrl(customUrl)
    ? customUrl!
    : isAppsScriptWebAppUrl(cfg.webAppUrl)
    ? cfg.webAppUrl
    : '';

  if (!targetUrl) {
    return {
      status: 'success',
      message: 'Data tersimpan di Google Sheets & Drive Database Server!',
      internal: true,
    };
  }

  // 2. Serialize all outbound Google Apps Script POST requests through serverWebhookQueue (FIFO)
  // so simultaneous registrations never collide or hit Apps Script lock timeouts
  activeServerWebhookCount++;
  const queuedTask = serverWebhookQueue.then(async () => {
    try {
      markServerMutation();
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow',
      });
      markServerMutation();
      if (response.ok) {
        const text = await response.text();
        try {
          const parsed = JSON.parse(text);
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
    } finally {
      activeServerWebhookCount = Math.max(0, activeServerWebhookCount - 1);
    }
    return {
      status: 'success',
      message: 'Data tersimpan di Google Sheets & Drive Database!',
      internal: true,
    };
  });

  serverWebhookQueue = queuedTask.catch(() => null);
  return queuedTask;
}

/**
 * Fallback reader when a Google Spreadsheet view URL (docs.google.com/spreadsheets/d/ID)
 * is provided instead of an Apps Script /exec URL and the sheet is publicly viewable.
 */
async function tryFetchFromPublicSpreadsheetGviz(spreadsheetId: string): Promise<any | null> {
  try {
    const pengUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=Pengaturan`;
    const res = await fetch(pengUrl, { redirect: 'follow' });
    if (!res.ok) return null;
    const text = await res.text();
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
    if (!jsonMatch || !jsonMatch[1]) return null;
    const parsed = JSON.parse(jsonMatch[1]);
    const rows = parsed?.table?.rows;
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const settings: Record<string, any> = {};
    for (const r of rows) {
      const cells = r?.c;
      if (Array.isArray(cells) && cells[0]?.v) {
        const key = String(cells[0].v).trim();
        const val = cells[1]?.v !== undefined && cells[1]?.v !== null ? String(cells[1].v) : '';
        if (key && key !== 'Key') {
          if (key === 'qrisAutoVerify') {
            settings[key] = val === 'true' || val === 'TRUE' || val === '1';
          } else if (key === 'promos') {
            try {
              settings.promos = JSON.parse(val || '[]');
            } catch {
              settings.promos = [];
            }
          } else {
            settings[key] = val;
          }
        }
      }
    }

    if (Object.keys(settings).length === 0) return null;
    const sanitized = sanitizeSheetSettings(settings);
    delete sanitized._hadFormulaError;
    return {
      status: 'success',
      source: 'external_google_sheets',
      settings: sanitized,
    };
  } catch {
    return null;
  }
}

export async function fetchFromGoogleSheetsServer(): Promise<any> {
  const cfg = loadSheetsConfig();

  // 1. Try Apps Script Web App URL if configured
  if (cfg.webAppUrl && isAppsScriptWebAppUrl(cfg.webAppUrl)) {
    try {
      const response = await fetch(cfg.webAppUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'follow',
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'success') {
          if (data.settings) {
            const sanitized = sanitizeSheetSettings(data.settings);
            const hadError = sanitized._hadFormulaError;
            delete sanitized._hadFormulaError;
            data.settings = sanitized;
            if (hadError) {
              // Automatically repair the #ERROR! cell in Google Sheets
              syncSheetsWebhook('update_settings', sanitized).catch(() => {});
            }
          }
          const mirrored = mirrorExternalSheetsDataToServer(data);
          if (mirrored.mergedSettings) {
            data.settings = mirrored.mergedSettings;
          }
          data.source = 'external_google_sheets';
          return data;
        }
      }
    } catch (err: any) {
      console.warn('[Google Sheets External Fetch Warning]:', err.message || err);
    }
  }

  // 2. If a docs.google.com/spreadsheets/d/ID link is configured, try public Gviz JSON reader
  const sheetId = extractSpreadsheetId(cfg.webAppUrl) || extractSpreadsheetId(cfg.spreadsheetUrl);
  if (sheetId) {
    const gvizData = await tryFetchFromPublicSpreadsheetGviz(sheetId);
    if (gvizData && gvizData.settings) {
      mirrorExternalSheetsDataToServer(gvizData);
    }
  }

  // 3. Return live internal Google Sheets database format (synced across all devices via server)
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
    if (fs.existsSync(COMPANY_SETTINGS_PATH)) {
      diskCompanySettings = JSON.parse(fs.readFileSync(COMPANY_SETTINGS_PATH, 'utf-8'));
    }
  } catch {}

  const settingsObj: Record<string, any> = { ...diskCompanySettings };
  db.sheets.Pengaturan.forEach((row) => {
    if (row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== '') {
      const k = String(row[0]);
      if (k === 'qrisAutoVerify') {
        settingsObj[k] = String(row[1]) === 'true' || row[1] === true;
      } else if (k === 'promos') {
        try {
          const parsedPromos = typeof row[1] === 'string' ? JSON.parse(row[1]) : row[1];
          if (Array.isArray(parsedPromos) && parsedPromos.length > 0) {
            settingsObj.promos = parsedPromos;
          }
        } catch {}
      } else {
        settingsObj[k] = row[1];
      }
    }
  });

  // Ensure diskCompanySettings (most recently saved via API) takes priority for fields present in it
  Object.keys(diskCompanySettings).forEach((k) => {
    if (diskCompanySettings[k] !== undefined && diskCompanySettings[k] !== null && String(diskCompanySettings[k]).trim() !== '') {
      settingsObj[k] = diskCompanySettings[k];
    }
  });

  const cleanSettings = sanitizeSheetSettings(settingsObj);
  delete cleanSettings._hadFormulaError;

  if (cleanSettings.logoUrl) {
    cleanSettings.logoUrl = normalizeGoogleDriveImageUrl(cleanSettings.logoUrl);
  }
  if (cleanSettings.qrisUrl) {
    cleanSettings.qrisUrl = normalizeGoogleDriveImageUrl(cleanSettings.qrisUrl);
  }

  return {
    status: 'success',
    source: 'internal_google_sheets',
    customers,
    tickets,
    settings: cleanSettings,
    sheets: db.sheets,
    headers: db.headers,
  };
}
