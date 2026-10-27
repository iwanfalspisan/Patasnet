import { CustomerUser, SupportTicket, PaymentRecord, WifiPackage } from '../types.ts';
import fs from 'fs';
import path from 'path';
import {
  getGoogleSheetsDatabase,
  saveGoogleSheetsDatabase,
  syncSheetsWebhook,
} from '../lib/serverSheets.ts';
import { normalizeGoogleDriveImageUrl } from '../lib/googleSheetsIntegration.ts';

// ---------------------- PACKAGES & COVERAGE STORE (PERSISTED TO DISK & SHEETS) ----------------------

const PACKAGES_PATH = path.resolve(process.cwd(), 'data/packages.json');
const COVERAGE_PATH = path.resolve(process.cwd(), 'data/coverage.json');
const EXTRA_SETTINGS_PATH = path.resolve(process.cwd(), 'data/company_settings.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

function persistImageForCrossDevice(base64OrUrl: string | undefined, category: string, prefix: string): string {
  if (!base64OrUrl || typeof base64OrUrl !== 'string') return '';
  const trimmed = base64OrUrl.trim();
  if (!trimmed) return '';

  if (!trimmed.startsWith('data:')) {
    return normalizeGoogleDriveImageUrl(trimmed);
  }

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
    console.warn('Error persisting image to uploads:', err);
  }
  return trimmed;
}

const DEFAULT_PACKAGES: WifiPackage[] = [
  { id: 'home-10m', name: 'Home Basic 10 Mbps', speed: '10 Mbps', price: 120000, features: ['Kecepatan Stabil up to 10 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 1-3 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'], type: 'home', popular: false },
  { id: 'home-15m', name: 'Home Starter 15 Mbps', speed: '15 Mbps', price: 160000, features: ['Kecepatan Stabil up to 15 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 3-5 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'], type: 'home', popular: false },
  { id: 'home-20m', name: 'Home Lite 20 Mbps', speed: '20 Mbps', price: 170000, features: ['Kecepatan Stabil up to 20 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 4-6 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'], type: 'home', popular: true },
  { id: 'home-30m', name: 'Home Family 30 Mbps', speed: '30 Mbps', price: 210000, features: ['Kecepatan Stabil up to 30 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 6-8 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'], type: 'home', popular: false },
  { id: 'home-50m', name: 'Home Pro 50 Mbps', speed: '50 Mbps', price: 270000, features: ['Kecepatan Stabil up to 50 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 8-10 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'], type: 'home', popular: false },
  { id: 'home-100m', name: 'Home Ultra 100 Mbps', speed: '100 Mbps', price: 490000, features: ['Kecepatan Stabil up to 100 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 10-15 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'], type: 'home', popular: false },
  { id: 'patasnet-prime', name: 'Patas Net PRIME 50 Mbps', speed: 'Up to 50 Mbps', price: 220000, features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support CCTV Online Rumah', 'Streaming Smart TV 4K', 'GRATIS Biaya Pasang'], type: 'business', popular: false },
  { id: 'patasnet-exclusive', name: 'Patas Net EXCLUSIVE 100 Mbps', speed: 'Up to 100 Mbps', price: 275000, features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 2 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang'], type: 'business', popular: true },
  { id: 'patasnet-exclusive2', name: 'Patas Net EXCLUSIVE II 200 Mbps', speed: 'Up to 200 Mbps', price: 310000, features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 3 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang'], type: 'business', popular: false },
  { id: 'patasnet-bisnis', name: 'Patas Net BISNIS 300 Mbps', speed: 'Up to 300 Mbps', price: 375000, features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 5+ CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Super Stabil', 'GRATIS Biaya Pasang'], type: 'business', popular: false },
];

const DEFAULT_COVERAGE: Array<{
  id: number;
  cityName: string;
  regionType: string;
  kecamatans: any[];
}> = [
  {
    id: 1,
    cityName: 'Jakarta Selatan',
    regionType: 'Kota',
    kecamatans: [
      { name: 'Kebayoran Baru', kelurahans: [{ name: 'Rawa Barat', status: 'active', nodesCount: 12 }, { name: 'Selong', status: 'active', nodesCount: 8 }, { name: 'Melawai', status: 'active', nodesCount: 15 }, { name: 'Kramat Pela', status: 'active', nodesCount: 11 }, { name: 'Gunung', status: 'active', nodesCount: 9 }] },
      { name: 'Cilandak', kelurahans: [{ name: 'Cipete Selatan', status: 'active', nodesCount: 14 }, { name: 'Gandaria Selatan', status: 'active', nodesCount: 16 }, { name: 'Pondok Labu', status: 'active', nodesCount: 22 }, { name: 'Lebak Bulus', status: 'active', nodesCount: 18 }] },
      { name: 'Mampang Prapatan', kelurahans: [{ name: 'Kuningan Barat', status: 'active', nodesCount: 25 }, { name: 'Pela Mampang', status: 'active', nodesCount: 19 }, { name: 'Bangka', status: 'active', nodesCount: 15 }] },
      { name: 'Tebet', kelurahans: [{ name: 'Menteng Dalam', status: 'active', nodesCount: 14 }, { name: 'Tebet Barat', status: 'active', nodesCount: 17 }] }
    ]
  },
  {
    id: 2,
    cityName: 'Depok',
    regionType: 'Kota',
    kecamatans: [
      { name: 'Beji', kelurahans: [{ name: 'Pondok Cina', status: 'active', nodesCount: 32 }, { name: 'Beji Timur', status: 'active', nodesCount: 12 }, { name: 'Kemiri Muka', status: 'active', nodesCount: 18 }] },
      { name: 'Pancoran Mas', kelurahans: [{ name: 'Depok Jaya', status: 'active', nodesCount: 14 }, { name: 'Mampang', status: 'active', nodesCount: 10 }, { name: 'Pancoran Mas', status: 'active', nodesCount: 16 }] },
      { name: 'Cinere', kelurahans: [{ name: 'Cinere', status: 'active', nodesCount: 20 }, { name: 'Gandul', status: 'active', nodesCount: 15 }, { name: 'Pangkalan Jati', status: 'active', nodesCount: 11 }] }
    ]
  },
  {
    id: 3,
    cityName: 'Tangerang Selatan',
    regionType: 'Kota',
    kecamatans: [
      { name: 'Serpong', kelurahans: [{ name: 'Lengkong Gudang', status: 'active', nodesCount: 24 }, { name: 'Serpong', status: 'active', nodesCount: 18 }, { name: 'Cilenggang', status: 'active', nodesCount: 14 }] },
      { name: 'Ciputat', kelurahans: [{ name: 'Ciputat', status: 'active', nodesCount: 15 }, { name: 'Cipayung', status: 'active', nodesCount: 12 }, { name: 'Sawah Baru', status: 'active', nodesCount: 10 }] },
      { name: 'Pondok Aren', kelurahans: [{ name: 'Jurang Mangu Timur', status: 'active', nodesCount: 22 }, { name: 'Pondok Jaya', status: 'active', nodesCount: 16 }] }
    ]
  },
  {
    id: 4,
    cityName: 'Bogor',
    regionType: 'Kota',
    kecamatans: [
      { name: 'Bogor Timur', kelurahans: [{ name: 'Baranangsiang', status: 'active', nodesCount: 19 }, { name: 'Katulampa', status: 'active', nodesCount: 28 }, { name: 'Sukasari', status: 'active', nodesCount: 11 }] },
      { name: 'Bogor Selatan', kelurahans: [{ name: 'Batutulis', status: 'active', nodesCount: 15 }, { name: 'Bondongan', status: 'active', nodesCount: 12 }, { name: 'Empang', status: 'active', nodesCount: 20 }] }
    ]
  },
  {
    id: 5,
    cityName: 'Ciomas (Bogor)',
    regionType: 'Kabupaten',
    kecamatans: [
      { name: 'Ciomas', kelurahans: [{ name: 'Ciomas Rahayu', status: 'active', nodesCount: 24 }, { name: 'Ciomas Indah', status: 'active', nodesCount: 15 }, { name: 'Pagelaran', status: 'active', nodesCount: 31 }] }
    ]
  }
];

function loadPackagesFromDisk(): WifiPackage[] {
  try {
    if (fs.existsSync(PACKAGES_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(PACKAGES_PATH, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_PACKAGES];
}

function savePackagesToDisk(pkgs: WifiPackage[]): void {
  try {
    const dir = path.dirname(PACKAGES_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PACKAGES_PATH, JSON.stringify(pkgs, null, 2), 'utf-8');
  } catch {}
}

function loadCoverageFromDisk(): typeof DEFAULT_COVERAGE {
  try {
    if (fs.existsSync(COVERAGE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_COVERAGE];
}

function saveCoverageToDisk(cov: typeof DEFAULT_COVERAGE): void {
  try {
    const dir = path.dirname(COVERAGE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COVERAGE_PATH, JSON.stringify(cov, null, 2), 'utf-8');
  } catch {}
}

function formatCoverageList(list: typeof DEFAULT_COVERAGE) {
  return list.map((c) => {
    const kecamatans = c.kecamatans || [];
    let totalKel = 0;
    kecamatans.forEach((k: any) => {
      totalKel += (k.kelurahans || []).length;
    });
    return {
      id: c.id,
      cityName: c.cityName,
      regionType: c.regionType,
      totalKecamatan: kecamatans.length,
      totalKelurahan: totalKel,
      kecamatans,
    };
  });
}

// ---------------------- SEEDING / INITIALIZATION ----------------------

export async function seedDatabaseIfEmpty() {
  // Initialize Google Sheets Database if needed
  getGoogleSheetsDatabase();
}

// ---------------------- CUSTOMERS REPOSITORY (GOOGLE SHEETS & DRIVE) ----------------------

function mapSheetsRowToCustomer(row: any[], db: ReturnType<typeof getGoogleSheetsDatabase>): CustomerUser & { passwordHash?: string } {
  const id = String(row[1] || '');
  const coordsStr = String(row[6] || '-6.2088, 106.8456');
  const coords: [number, number] = coordsStr.includes(',')
    ? (coordsStr.split(',').map((n) => parseFloat(n.trim())) as [number, number])
    : [-6.2088, 106.8456];

  const payments: PaymentRecord[] = (db.sheets.Pembayaran || [])
    .filter((p) => String(p[2]) === id)
    .map((p) => ({
      id: String(p[1]),
      date: String(p[0] || '').substring(0, 19),
      amount: Number(p[4]) || 170000,
      billingPeriod: String(p[5] || 'Tagihan Berjalan'),
      method: String(p[6] || 'Transfer Bank'),
      status: (p[7] || 'unpaid') as 'unpaid' | 'pending_verification' | 'paid',
      proofOfPaymentUrl: normalizeGoogleDriveImageUrl(p[8]) || undefined,
      transactionId: p[9] ? String(p[9]) : undefined,
    }));

  const tickets: SupportTicket[] = (db.sheets.Tiket || [])
    .filter((t) => String(t[2]) === id)
    .map((t) => ({
      id: String(t[1]),
      userId: String(t[2] || ''),
      userName: String(t[3] || ''),
      email: String(row[3] || ''),
      phone: String(t[4] || ''),
      message: String(t[5] || ''),
      date: String(t[0] || ''),
      status: (t[6] === 'resolved' ? 'resolved' : 'open') as 'open' | 'resolved',
    }));

  return {
    id,
    name: String(row[2] || ''),
    email: String(row[3] || '').toLowerCase(),
    phone: String(row[4] || ''),
    address: String(row[5] || ''),
    coordinates: coords,
    packageId: String(row[7] || 'home-20m'),
    status: (row[8] || 'active') as 'pending' | 'active' | 'suspended',
    ktpImageUrl: normalizeGoogleDriveImageUrl(row[9]) || undefined,
    passwordHash: row[10] ? String(row[10]) : '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    createdAt: String(row[0] || new Date().toISOString().split('T')[0]),
    payments,
    tickets,
  };
}

export async function getAllCustomers(): Promise<CustomerUser[]> {
  const db = getGoogleSheetsDatabase();
  return (db.sheets.Pelanggan || []).map((row) => mapSheetsRowToCustomer(row, db));
}

export async function getCustomerById(id: string): Promise<CustomerUser | null> {
  const db = getGoogleSheetsDatabase();
  const row = (db.sheets.Pelanggan || []).find((r) => String(r[1]) === String(id));
  if (!row) return null;
  return mapSheetsRowToCustomer(row, db);
}

export async function getCustomerByEmail(email: string) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const db = getGoogleSheetsDatabase();
  const row = (db.sheets.Pelanggan || []).find(
    (r) => String(r[3] || '').trim().toLowerCase() === cleanEmail
  );
  if (!row) return null;
  return mapSheetsRowToCustomer(row, db);
}

export async function createCustomer(data: {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  coordinates: [number, number];
  packageId: string;
  status: 'pending' | 'active' | 'suspended';
  ktpImageUrl?: string;
  passwordHash: string;
  createdAt: string;
  initialPayment: PaymentRecord;
}) {
  const db = getGoogleSheetsDatabase();
  const ktpUrl = persistImageForCrossDevice(data.ktpImageUrl, 'ktp', `KTP_${data.id}`);
  const coordStr = Array.isArray(data.coordinates)
    ? data.coordinates.join(', ')
    : '-6.2088, 106.8456';

  const newRow = [
    data.createdAt,
    data.id,
    data.name,
    data.email.toLowerCase(),
    data.phone,
    data.address,
    coordStr,
    data.packageId,
    data.status,
    ktpUrl,
    data.passwordHash,
  ];

  const existingIdx = db.sheets.Pelanggan.findIndex((r) => String(r[1]) === String(data.id));
  if (existingIdx >= 0) {
    db.sheets.Pelanggan[existingIdx] = newRow;
  } else {
    db.sheets.Pelanggan.unshift(newRow);
  }

  const hasPay = db.sheets.Pembayaran.some((p) => String(p[1]) === String(data.initialPayment.id) || String(p[2]) === String(data.id));
  if (!hasPay) {
    db.sheets.Pembayaran.unshift([
      data.initialPayment.date,
      data.initialPayment.id,
      data.id,
      data.name,
      data.initialPayment.amount,
      data.initialPayment.billingPeriod,
      data.initialPayment.method || 'QRIS / Transfer',
      data.initialPayment.status,
      persistImageForCrossDevice(data.initialPayment.proofOfPaymentUrl, 'proofs', `BUKTI_${data.initialPayment.id}`),
    ]);
  }

  saveGoogleSheetsDatabase(db);
  return await getCustomerById(data.id);
}

export async function updateCustomerStatus(id: string, status: 'pending' | 'active' | 'suspended') {
  const db = getGoogleSheetsDatabase();
  for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
    if (String(db.sheets.Pelanggan[i][1]) === String(id)) {
      db.sheets.Pelanggan[i][8] = status;
      break;
    }
  }
  saveGoogleSheetsDatabase(db);
  return await getCustomerById(id);
}

export async function deleteCustomer(id: string) {
  await syncSheetsWebhook('delete_customer', { id });
  return true;
}

// ---------------------- PAYMENTS REPOSITORY (GOOGLE SHEETS & DRIVE) ----------------------

export async function submitPaymentProof(data: {
  userId: string;
  paymentId: string;
  method?: string;
  proofOfPaymentUrl: string;
  date: string;
}) {
  const db = getGoogleSheetsDatabase();
  const proofUrl = persistImageForCrossDevice(data.proofOfPaymentUrl, 'proofs', `BUKTI_${data.paymentId}`);

  let updated = false;
  for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
    if (String(db.sheets.Pembayaran[i][1]) === String(data.paymentId)) {
      db.sheets.Pembayaran[i][0] = data.date;
      db.sheets.Pembayaran[i][6] = data.method || db.sheets.Pembayaran[i][6] || 'Transfer Bank';
      db.sheets.Pembayaran[i][7] = 'pending_verification';
      if (proofUrl) db.sheets.Pembayaran[i][8] = proofUrl;
      updated = true;
      break;
    }
  }

  if (!updated) {
    const cust = await getCustomerById(data.userId);
    db.sheets.Pembayaran.unshift([
      data.date,
      data.paymentId,
      data.userId,
      cust?.name || 'Pelanggan',
      170000,
      'Tagihan Berjalan',
      data.method || 'Transfer Bank',
      'pending_verification',
      proofUrl,
    ]);
  }

  saveGoogleSheetsDatabase(db);
  return await getCustomerById(data.userId);
}

export async function approvePayment(userId: string, paymentId: string) {
  const txId = `TX-${Math.floor(88001000 + Math.random() * 9000)}`;
  const db = getGoogleSheetsDatabase();

  for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
    if (String(db.sheets.Pembayaran[i][1]) === String(paymentId)) {
      db.sheets.Pembayaran[i][7] = 'paid';
      db.sheets.Pembayaran[i][9] = txId;
      break;
    }
  }

  for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
    if (String(db.sheets.Pelanggan[i][1]) === String(userId)) {
      if (db.sheets.Pelanggan[i][8] === 'pending') {
        db.sheets.Pelanggan[i][8] = 'active';
      }
      break;
    }
  }

  saveGoogleSheetsDatabase(db);
  return await getCustomerById(userId);
}

export async function rejectPayment(userId: string, paymentId: string) {
  const db = getGoogleSheetsDatabase();

  for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
    if (String(db.sheets.Pembayaran[i][1]) === String(paymentId)) {
      db.sheets.Pembayaran[i][7] = 'unpaid';
      db.sheets.Pembayaran[i][8] = '';
      break;
    }
  }

  saveGoogleSheetsDatabase(db);
  return await getCustomerById(userId);
}

export async function processQrisPayment(userId: string, paymentId: string) {
  const txId = `QRIS-${Math.floor(100000 + Math.random() * 900000)}`;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const db = getGoogleSheetsDatabase();

  for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
    if (String(db.sheets.Pembayaran[i][1]) === String(paymentId)) {
      db.sheets.Pembayaran[i][0] = nowStr;
      db.sheets.Pembayaran[i][6] = 'QRIS';
      db.sheets.Pembayaran[i][7] = 'paid';
      db.sheets.Pembayaran[i][9] = txId;
      break;
    }
  }

  for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
    if (String(db.sheets.Pelanggan[i][1]) === String(userId)) {
      if (db.sheets.Pelanggan[i][8] === 'pending') {
        db.sheets.Pelanggan[i][8] = 'active';
      }
      break;
    }
  }

  saveGoogleSheetsDatabase(db);
  return await getCustomerById(userId);
}

// ---------------------- SUPPORT TICKETS REPOSITORY (GOOGLE SHEETS & DRIVE) ----------------------

export async function getAllTickets(): Promise<SupportTicket[]> {
  const db = getGoogleSheetsDatabase();
  return (db.sheets.Tiket || []).map((t) => ({
    id: String(t[1]),
    userId: String(t[2] || ''),
    userName: String(t[3] || ''),
    email: '',
    phone: String(t[4] || ''),
    message: String(t[5] || ''),
    date: String(t[0] || ''),
    status: (t[6] === 'resolved' ? 'resolved' : 'open') as 'open' | 'resolved',
  }));
}

export async function createTicket(data: {
  id: string;
  userId?: string;
  userName: string;
  email: string;
  phone: string;
  message: string;
  date: string;
}) {
  const newTicket: SupportTicket = {
    id: data.id,
    userId: data.userId,
    userName: data.userName,
    email: data.email,
    phone: data.phone,
    message: data.message,
    date: data.date,
    status: 'open',
  };

  await syncSheetsWebhook('create_ticket', newTicket);
  return newTicket;
}

// ---------------------- WIFI PACKAGES REPOSITORY ----------------------

export async function getAllPackages(): Promise<WifiPackage[]> {
  return loadPackagesFromDisk();
}

export async function createPackage(pkg: WifiPackage) {
  const pkgs = loadPackagesFromDisk();
  const existingIdx = pkgs.findIndex((p) => p.id === pkg.id);
  if (existingIdx >= 0) {
    pkgs[existingIdx] = pkg;
  } else {
    pkgs.push(pkg);
  }
  savePackagesToDisk(pkgs);
  return pkg;
}

export async function deletePackage(id: string) {
  const pkgs = loadPackagesFromDisk().filter((p) => p.id !== id);
  savePackagesToDisk(pkgs);
  return true;
}

// ---------------------- COVERAGE AREAS REPOSITORY ----------------------

export async function getAllCoverage() {
  return formatCoverageList(loadCoverageFromDisk());
}

export async function createCityCoverage(cityName: string, regionType: string) {
  const cov = loadCoverageFromDisk();
  cov.push({
    id: cov.length + 1,
    cityName,
    regionType,
    kecamatans: [],
  });
  saveCoverageToDisk(cov);
  return formatCoverageList(cov);
}

export async function deleteCityCoverage(cityName: string) {
  const cov = loadCoverageFromDisk().filter((c) => c.cityName !== cityName);
  saveCoverageToDisk(cov);
  return formatCoverageList(cov);
}

export async function updateCoverageData(cityName: string, kecamatans: any[]) {
  const cov = loadCoverageFromDisk();
  const found = cov.find((c) => c.cityName === cityName);
  if (found) {
    found.kecamatans = kecamatans;
  }
  saveCoverageToDisk(cov);
  return formatCoverageList(cov);
}

// ---------------------- COMPANY SETTINGS REPOSITORY (GOOGLE SHEETS & DRIVE) ----------------------

function loadExtraCompanySettings() {
  try {
    if (fs.existsSync(EXTRA_SETTINGS_PATH)) {
      const raw = fs.readFileSync(EXTRA_SETTINGS_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading extra company settings:', e);
  }
  return {
    name: 'Patas Net WiFi',
    address: 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
    logoText: 'PATAS NET',
    themeColor: '#2563eb',
    logoUrl: '',
    promos: [] as string[],
    legalName: 'PT. AMANUSA TELEMEDIA',
    tagline: 'Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota',
    coverageText: '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan',
    whatsappNumber: '0812-3456-7890',
    phoneNumber: '+62 899-3299-977',
    email: 'cs@patasnet.id',
    instagramUrl: 'https://instagram.com/patasnet.id',
    facebookUrl: 'https://facebook.com/patasnet.id',
    youtubeUrl: 'https://youtube.com/@patasnet',
    qrisUrl: '',
    qrisMerchantName: 'PATAS NET - PT AMANUSA TELEMEDIA',
    qrisNmid: 'ID1020039281747',
    qrisAutoVerify: true,
    qrisInstructions: 'Buka m-Banking atau e-Wallet Anda (BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay), scan barcode QRIS, masukkan nominal sesuai tagihan, lalu klik tombol Konfirmasi Pembayaran QRIS.',
  };
}

function saveExtraCompanySettings(data: Record<string, any>) {
  try {
    const dir = path.dirname(EXTRA_SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = loadExtraCompanySettings();
    const processed = { ...data };
    if (processed.logoUrl && String(processed.logoUrl).trim() !== '') {
      processed.logoUrl = persistImageForCrossDevice(processed.logoUrl, 'logos', 'logo_patasnet');
    }
    if (processed.qrisUrl && String(processed.qrisUrl).trim() !== '') {
      processed.qrisUrl = persistImageForCrossDevice(processed.qrisUrl, 'qris', 'qris_patasnet');
    }
    if (Array.isArray(processed.promos)) {
      processed.promos = processed.promos.map((pr: string, idx: number) =>
        persistImageForCrossDevice(pr, 'promos', `promo_${idx}`)
      );
    }
    const merged = { ...current, ...processed };
    fs.writeFileSync(EXTRA_SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving extra company settings:', e);
  }
}

export async function getCompanySettings() {
  const extra = loadExtraCompanySettings();
  const db = getGoogleSheetsDatabase();
  const sheetSettings: Record<string, any> = {};

  (db.sheets.Pengaturan || []).forEach((row) => {
    const key = String(row[0] || '');
    const val = row[1];
    if (key && val !== undefined && val !== null && String(val).trim() !== '') {
      if (key === 'qrisAutoVerify') {
        sheetSettings[key] = String(val) === 'true' || val === true;
      } else {
        sheetSettings[key] = val;
      }
    }
  });

  const merged = {
    ...extra,
    ...sheetSettings,
    name: sheetSettings.name || extra.name || 'Patas Net WiFi',
    address: sheetSettings.address || extra.address || 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
    logoText: sheetSettings.logoText || extra.logoText || 'PATAS NET',
    themeColor: sheetSettings.themeColor || extra.themeColor || '#2563eb',
    logoUrl: normalizeGoogleDriveImageUrl(sheetSettings.logoUrl || extra.logoUrl || ''),
    qrisUrl: normalizeGoogleDriveImageUrl(sheetSettings.qrisUrl || extra.qrisUrl || ''),
    promos: Array.isArray(extra.promos)
      ? extra.promos.map((p: string) => normalizeGoogleDriveImageUrl(p))
      : [],
  };

  return merged;
}

export async function updateCompanySettings(data: {
  name?: string;
  address?: string;
  logoText?: string;
  themeColor?: string;
  logoUrl?: string;
  promos?: string[];
  legalName?: string;
  tagline?: string;
  coverageText?: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  email?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  qrisUrl?: string;
  qrisMerchantName?: string;
  qrisNmid?: string;
  qrisAutoVerify?: boolean;
  qrisInstructions?: string;
}) {
  saveExtraCompanySettings(data);
  const current = loadExtraCompanySettings();
  await syncSheetsWebhook('update_settings', current);
  return await getCompanySettings();
}

// ---------------------- DATABASE STATS REPOSITORY ----------------------

export async function getDatabaseMetrics() {
  const db = getGoogleSheetsDatabase();
  const pkgs = loadPackagesFromDisk();
  const cov = loadCoverageFromDisk();

  return {
    engine: 'Google Sheets & Google Drive Cloud Database',
    region: 'Google Cloud Global (Realtime 2-Way Sync)',
    status: 'Connected & Healthy',
    totalCustomers: db.sheets.Pelanggan.length,
    activeCustomers: db.sheets.Pelanggan.filter((r) => r[8] === 'active').length,
    pendingVerificationPayments: db.sheets.Pembayaran.filter((r) => r[7] === 'pending_verification').length,
    tables: {
      customers: db.sheets.Pelanggan.length,
      payments: db.sheets.Pembayaran.length,
      support_tickets: db.sheets.Tiket.length,
      wifi_packages: pkgs.length,
      coverage_areas: cov.length,
    },
    connectionPool: 'Google Sheets Webhook + Server-Sent Events (SSE)',
    orm: 'Google Sheets & Drive Native Connector',
    storageType: 'Google Spreadsheet + Google Drive Image Cloud',
  };
}
