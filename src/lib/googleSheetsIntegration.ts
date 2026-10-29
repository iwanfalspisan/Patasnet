import defaultSheetsConfig from '../../data/sheets_config.json';

/**
 * HARDCODED / EMBEDDED GOOGLE SHEETS, GOOGLE DRIVE & APPS SCRIPT LINKS
 * Ensures the website always loads the exact same data and images across all devices,
 * browsers, Incognito tabs, and Vercel deployments without ever starting empty.
 */
export const EMBEDDED_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxx8KSnUTRfbnNCDOfbINbvjVZ6QJz9pku66uBQwp5cC_om74XFCBvWwqqu6204Z6Kj/exec';
export const LEGACY_APPS_SCRIPT_URLS = [
  'https://script.google.com/macros/s/AKfycbxXScZJqOQ9myhQkmxUBClZx8LGj0xBgPxIskOTBMr_o4-hfQ-Tqq0dqus6jaOZX5gr/exec',
];
export const EMBEDDED_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1N_qoqU4a5Zu3wXrAQk3GKyNGWuiPtjl2BVf2BpX0TaM/edit?gid=0#gid=0';
export const EMBEDDED_SPREADSHEET_ID = '1N_qoqU4a5Zu3wXrAQk3GKyNGWuiPtjl2BVf2BpX0TaM';
export const EMBEDDED_DRIVE_LOGO_URL = 'https://lh3.googleusercontent.com/d/19XTAmSKJriECYxElOmTLkvxpdhuP1wgA';
export const EMBEDDED_DRIVE_FOLDER_NAME = 'PatasNet_Drive';

export const DEFAULT_HERO_SLIDES: string[] = [
  'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80',
];

/**
 * Google Sheets & Google Drive Cloud Database Integration for Patas Net
 *
 * Converts any Google Drive sharing URL into a direct, fast-loading image URL
 * that renders across all devices (mobile, tablet, desktop) without CORS issues.
 */
export function normalizeGoogleDriveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Map legacy local upload logo path directly to the permanent Google Drive logo URL so it works on Vercel & all devices
  if (trimmed === '/uploads/logos/logo_patasnet_1793121396292.png') {
    return EMBEDDED_DRIVE_LOGO_URL;
  }

  // Already a base64 data URI or local upload path
  if (trimmed.startsWith('data:') || trimmed.startsWith('/uploads/') || trimmed.startsWith('/logo')) {
    return trimmed;
  }

  // Match https://drive.google.com/file/d/FILE_ID/view...
  const fileDMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
  }

  // Match https://drive.google.com/open?id=FILE_ID or uc?id=FILE_ID or uc?export=view&id=FILE_ID
  const idParamMatch = trimmed.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${idParamMatch[1]}`;
  }

  return trimmed;
}

/**
 * Sanitizes settings coming from Google Sheets so formula parse errors
 * (such as "#ERROR!" when a phone number starts with "+62") are automatically
 * repaired across all devices.
 */
export function sanitizeSheetSettings<T extends Record<string, any>>(settings: T): T & { _hadFormulaError?: boolean } {
  if (!settings || typeof settings !== 'object') return settings;
  const cleaned: Record<string, any> = { ...settings };
  let hadFormulaError = false;

  const isFormulaError = (val: any): boolean => {
    if (typeof val !== 'string') return false;
    const upper = val.trim().toUpperCase();
    return (
      upper === '#ERROR!' ||
      upper === '#VALUE!' ||
      upper === '#NAME?' ||
      upper === '#REF!' ||
      upper === '#N/A' ||
      upper === '#NUM!' ||
      upper === 'ERROR'
    );
  };

  const defaults: Record<string, string> = {
    name: 'Patas.Net',
    legalName: 'SMK Negeri 4 Tasikmalaya',
    tagline: 'Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota',
    coverageText: '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan',
    whatsappNumber: '0812-3456-7890',
    phoneNumber: '+62 899-3299-977',
    email: 'cs@patasnet.id',
    address: 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
    logoText: 'PATAS NET',
    themeColor: '#2563eb',
    logoUrl: EMBEDDED_DRIVE_LOGO_URL,
  };

  for (const key of Object.keys(cleaned)) {
    const val = cleaned[key];
    if (typeof val === 'string') {
      if (isFormulaError(val)) {
        cleaned[key] = defaults[key] || '';
        hadFormulaError = true;
      } else if (val.startsWith("'+") || val.startsWith("'=")) {
        cleaned[key] = val.substring(1);
      }
    }
  }

  if (typeof cleaned.heroSlides === 'string') {
    try {
      const parsed = JSON.parse(cleaned.heroSlides);
      cleaned.heroSlides = Array.isArray(parsed) ? parsed : DEFAULT_HERO_SLIDES;
    } catch {
      cleaned.heroSlides = DEFAULT_HERO_SLIDES;
    }
  }

  if (cleaned.logoUrl === '/uploads/logos/logo_patasnet_1793121396292.png') {
    cleaned.logoUrl = EMBEDDED_DRIVE_LOGO_URL;
  }

  if (hadFormulaError) {
    cleaned._hadFormulaError = true;
  }

  return cleaned as T & { _hadFormulaError?: boolean };
}

/**
 * Checks whether a URL is a valid deployed Google Apps Script Web App URL.
 */
export function isAppsScriptWebAppUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.trim().startsWith('https://script.google.com/macros/s/');
}

/**
 * Extracts a Google Spreadsheet ID if the user pasted a docs.google.com/spreadsheets/d/<ID> link.
 */
export function extractSpreadsheetId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Returns the default Google Sheets Web App URL from Vite Environment Variables,
 * data/sheets_config.json, or the hardcoded EMBEDDED_APPS_SCRIPT_URL.
 */
export function getEnvOrDefaultSheetsUrl(): string {
  try {
    const envMeta = (import.meta as any).env;
    if (envMeta) {
      const viteUrl =
        envMeta.VITE_GOOGLE_SHEETS_URL ||
        envMeta.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
        envMeta.NEXT_PUBLIC_GOOGLE_SHEETS_URL;
      if (viteUrl && typeof viteUrl === 'string' && viteUrl.trim() !== '') {
        return viteUrl.trim();
      }
    }
  } catch {}

  try {
    if (defaultSheetsConfig && typeof (defaultSheetsConfig as any).webAppUrl === 'string') {
      const cfgUrl = (defaultSheetsConfig as any).webAppUrl.trim();
      if (cfgUrl && isAppsScriptWebAppUrl(cfgUrl)) return cfgUrl;
    }
  } catch {}

  return EMBEDDED_APPS_SCRIPT_URL;
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - CLOUD DATABASE OTOMATIS PATAS NET WIFI (VERCEL READY)
 * ============================================================================
 * Database Utama : Google Sheets (6 Sheet Otomatis)
 * Penyimpanan File: Google Drive (Folder Otomatis: PatasNet_Drive)
 *
 * CARA PAKAI:
 * 1. Klik tombol "Run" di atas (pilih fungsi: setupDatabaseOtomatis) ATAU
 *    langsung klik "Deploy > New deployment > Web app (Who has access: Anyone)".
 * 2. Seluruh Sheet (Pelanggan, Pembayaran, Tiket, Pengaturan, Paket, Cakupan)
 *    dan Folder Google Drive akan TERBUAT SECARA OTOMATIS!
 * ============================================================================
 */

// 1. FUNGSI UTAMA OTOMATIS (Berjalan saat klik tombol "Run" di Apps Script ATAU saat Deploy diakses)
function setupDatabaseOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Pastikan script ini dipasang melalui menu Extensions > Apps Script di dalam Google Spreadsheet Anda.");
  }

  // A. Buat Folder Utama & Subfolder di Google Drive secara otomatis
  var mainFolder = getOrCreateFolder("PatasNet_Drive");
  getOrCreateSubFolder(mainFolder, "KTP_Pelanggan");
  getOrCreateSubFolder(mainFolder, "Bukti_Pembayaran");
  getOrCreateSubFolder(mainFolder, "Logo_dan_QRIS");
  getOrCreateSubFolder(mainFolder, "Banner_Promo");

  // B. Sheet 1: Pelanggan
  var sheetPelanggan = ss.getSheetByName("Pelanggan");
  if (!sheetPelanggan) {
    sheetPelanggan = ss.insertSheet("Pelanggan");
  }
  if (sheetPelanggan.getLastRow() === 0) {
    sheetPelanggan.appendRow([
      "Timestamp", "ID Pelanggan", "Nama Lengkap", "Email", "Nomor WhatsApp",
      "Alamat Lengkap", "Koordinat GPS", "Paket WiFi", "Status", "URL Foto KTP Drive", "PasswordHash"
    ]);
    sheetPelanggan.getRange("A1:K1").setFontWeight("bold").setBackground("#2563eb").setFontColor("#ffffff");
    sheetPelanggan.getRange("E:E").setNumberFormat("@");
    sheetPelanggan.setFrozenRows(1);

    // Data awal contoh (otomatis terisi saat pertama kali dibuat)
    sheetPelanggan.appendRow([
      new Date(), "TR-1001", "Budi Santoso", "budi@gmail.com", "081234567890",
      "Jl. Melawai Raya No. 45, Kebayoran Baru, Jakarta Selatan", "-6.2443, 106.8005",
      "home-20m", "active", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80", "user123"
    ]);
    sheetPelanggan.appendRow([
      new Date(), "TR-1002", "Dewi Lestari", "dewi@gmail.com", "081298765432",
      "Jl. Cipete Raya No. 12, Cilandak, Jakarta Selatan", "-6.2781, 106.8052",
      "patasnet-exclusive", "active", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80", "user123"
    ]);
  }

  // C. Sheet 2: Pembayaran
  var sheetPembayaran = ss.getSheetByName("Pembayaran");
  if (!sheetPembayaran) {
    sheetPembayaran = ss.insertSheet("Pembayaran");
  }
  if (sheetPembayaran.getLastRow() === 0) {
    sheetPembayaran.appendRow([
      "Timestamp", "ID Pembayaran", "ID Pelanggan", "Nama Pelanggan",
      "Nominal (Rp)", "Periode Tagihan", "Metode", "Status", "URL Bukti Bayar Drive", "No Transaksi"
    ]);
    sheetPembayaran.getRange("A1:J1").setFontWeight("bold").setBackground("#10b981").setFontColor("#ffffff");
    sheetPembayaran.setFrozenRows(1);

    sheetPembayaran.appendRow([
      new Date(), "PAY-7001", "TR-1001", "Budi Santoso", 170000,
      "Bulan Berjalan", "Transfer Bank BCA", "paid",
      "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80", "TX-88001122"
    ]);
    sheetPembayaran.appendRow([
      new Date(), "PAY-7002", "TR-1002", "Dewi Lestari", 275000,
      "Bulan Berjalan", "QRIS", "paid",
      "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80", "TX-88001123"
    ]);
  }

  // D. Sheet 3: Tiket Keluhan
  var sheetTiket = ss.getSheetByName("Tiket");
  if (!sheetTiket) {
    sheetTiket = ss.insertSheet("Tiket");
  }
  if (sheetTiket.getLastRow() === 0) {
    sheetTiket.appendRow([
      "Timestamp", "ID Tiket", "ID Pelanggan", "Nama", "Nomor WA", "Pesan Masalah", "Status"
    ]);
    sheetTiket.getRange("A1:G1").setFontWeight("bold").setBackground("#f59e0b").setFontColor("#ffffff");
    sheetTiket.getRange("E:E").setNumberFormat("@");
    sheetTiket.setFrozenRows(1);

    sheetTiket.appendRow([
      new Date(), "TCK-5001", "TR-1001", "Budi Santoso", "081234567890",
      "Lampu indikator modem berkedip setelah hujan deras sore tadi.", "open"
    ]);
  }

  // E. Sheet 4: Pengaturan & Link Gambar Drive (Logo, QRIS, Promo)
  var sheetPengaturan = ss.getSheetByName("Pengaturan");
  if (!sheetPengaturan) {
    sheetPengaturan = ss.insertSheet("Pengaturan");
  }
  sheetPengaturan.getRange("B:B").setNumberFormat("@");
  if (sheetPengaturan.getLastRow() === 0) {
    sheetPengaturan.appendRow(["Key", "Value", "UpdatedAt"]);
    sheetPengaturan.getRange("A1:C1").setFontWeight("bold").setBackground("#6366f1").setFontColor("#ffffff");
    sheetPengaturan.setFrozenRows(1);

    var defaultSettings = [
      ["name", "PATAS NET", new Date()],
      ["logoText", "PATAS NET", new Date()],
      ["logoUrl", "", new Date()],
      ["qrisUrl", "", new Date()],
      ["qrisMerchantName", "PATAS NET - PT AMANUSA TELEMEDIA", new Date()],
      ["qrisNmid", "ID1020039281747", new Date()],
      ["qrisAutoVerify", "true", new Date()],
      ["qrisInstructions", "Scan barcode QRIS dengan m-Banking atau e-Wallet, lalu klik Konfirmasi Pembayaran QRIS.", new Date()],
      ["address", "Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110", new Date()],
      ["themeColor", "#2563eb", new Date()],
      ["tagline", "Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota", new Date()],
      ["coverageText", "5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan", new Date()],
      ["legalName", "PT. AMANUSA TELEMEDIA", new Date()],
      ["whatsappNumber", "0812-3456-7890", new Date()],
      ["phoneNumber", "'+62 899-3299-977", new Date()],
      ["email", "cs@patasnet.id", new Date()],
      ["instagramUrl", "https://instagram.com/patasnet.id", new Date()],
      ["facebookUrl", "https://facebook.com/patasnet.id", new Date()],
      ["youtubeUrl", "https://youtube.com/@patasnet", new Date()],
      ["promos", "[]", new Date()]
    ];
    for (var s = 0; s < defaultSettings.length; s++) {
      sheetPengaturan.appendRow(defaultSettings[s]);
    }
  } else {
    // Perbaiki otomatis jika ada baris phoneNumber yang terkena #ERROR! akibat tanda +
    var existingPeng = sheetPengaturan.getDataRange().getValues();
    for (var ep = 1; ep < existingPeng.length; ep++) {
      var kName = String(existingPeng[ep][0]).trim();
      var kVal = String(existingPeng[ep][1] || "").trim();
      if (kVal === "#ERROR!" || kVal === "#VALUE!" || kVal === "#NAME?") {
        var fixedVal = kName === "phoneNumber" ? "+62 899-3299-977" : (kName === "whatsappNumber" ? "0812-3456-7890" : "");
        sheetPengaturan.getRange(ep + 1, 2).setNumberFormat("@").setValue(fixedVal);
      }
    }
  }

  // F. Sheet 5: Paket WiFi
  var sheetPaket = ss.getSheetByName("Paket");
  if (!sheetPaket) {
    sheetPaket = ss.insertSheet("Paket");
  }
  if (sheetPaket.getLastRow() === 0) {
    sheetPaket.appendRow(["ID Paket", "Nama Paket", "Kecepatan", "Harga (Rp)", "Tipe", "Populer", "Fitur (JSON)"]);
    sheetPaket.getRange("A1:G1").setFontWeight("bold").setBackground("#8b5cf6").setFontColor("#ffffff");
    sheetPaket.setFrozenRows(1);

    var defaultPkgs = [
      ["home-10m", "Home Basic 10 Mbps", "10 Mbps", 120000, "home", false, JSON.stringify(["Kecepatan Stabil up to 10 Mbps", "Tanpa Batasan / Unlimited Kuota", "Ideal untuk 1-3 perangkat", "Bisa Sewa STB (+Rp25rb)", "GRATIS Biaya Pasang"])],
      ["home-15m", "Home Starter 15 Mbps", "15 Mbps", 160000, "home", false, JSON.stringify(["Kecepatan Stabil up to 15 Mbps", "Tanpa Batasan / Unlimited Kuota", "Ideal untuk 3-5 perangkat", "Bisa Sewa STB (+Rp25rb)", "GRATIS Biaya Pasang"])],
      ["home-20m", "Home Lite 20 Mbps", "20 Mbps", 170000, "home", true, JSON.stringify(["Kecepatan Stabil up to 20 Mbps", "Tanpa Batasan / Unlimited Kuota", "Ideal untuk 4-6 perangkat", "Bisa Sewa STB (+Rp25rb)", "GRATIS Biaya Pasang"])],
      ["home-30m", "Home Family 30 Mbps", "30 Mbps", 210000, "home", false, JSON.stringify(["Kecepatan Stabil up to 30 Mbps", "Tanpa Batasan / Unlimited Kuota", "Ideal untuk 6-8 perangkat", "Bisa Sewa STB (+Rp25rb)", "GRATIS Biaya Pasang"])],
      ["home-50m", "Home Pro 50 Mbps", "50 Mbps", 270000, "home", false, JSON.stringify(["Kecepatan Stabil up to 50 Mbps", "Tanpa Batasan / Unlimited Kuota", "Ideal untuk 8-10 perangkat", "Bisa Sewa STB (+Rp25rb)", "GRATIS Biaya Pasang"])],
      ["home-100m", "Home Ultra 100 Mbps", "100 Mbps", 490000, "home", false, JSON.stringify(["Kecepatan Stabil up to 100 Mbps", "Tanpa Batasan / Unlimited Kuota", "Ideal untuk 10-15 perangkat", "Bisa Sewa STB (+Rp25rb)", "GRATIS Biaya Pasang"])],
      ["patasnet-prime", "Patas Net PRIME 50 Mbps", "Up to 50 Mbps", 220000, "business", false, JSON.stringify(["100% Fiber Optik Unlimited", "Upload & Download Simetris 1:1", "Ideal untuk 10-15 perangkat aktif", "Support CCTV Online Rumah", "GRATIS Biaya Pasang"])],
      ["patasnet-exclusive", "Patas Net EXCLUSIVE 100 Mbps", "Up to 100 Mbps", 275000, "business", true, JSON.stringify(["100% Fiber Optik Unlimited", "Upload & Download Simetris 1:1", "Support 2 CCTV Online Rumah", "Gaming Online Stabil", "GRATIS Biaya Pasang"])],
      ["patasnet-exclusive2", "Patas Net EXCLUSIVE II 200 Mbps", "Up to 200 Mbps", 310000, "business", false, JSON.stringify(["100% Fiber Optik Unlimited", "Upload & Download Simetris 1:1", "Support 3 CCTV Online Rumah", "Gaming Online Stabil", "GRATIS Biaya Pasang"])],
      ["patasnet-bisnis", "Patas Net BISNIS 300 Mbps", "Up to 300 Mbps", 375000, "business", false, JSON.stringify(["100% Fiber Optik Unlimited", "Upload & Download Simetris 1:1", "Support 5+ CCTV Online Rumah", "Gaming Online Super Stabil", "GRATIS Biaya Pasang"])]
    ];
    for (var p = 0; p < defaultPkgs.length; p++) {
      sheetPaket.appendRow(defaultPkgs[p]);
    }
  }

  // G. Sheet 6: Wilayah Cakupan
  var sheetCakupan = ss.getSheetByName("Cakupan");
  if (!sheetCakupan) {
    sheetCakupan = ss.insertSheet("Cakupan");
  }
  if (sheetCakupan.getLastRow() === 0) {
    sheetCakupan.appendRow(["ID", "Nama Kota/Kabupaten", "Tipe Wilayah", "Data Kecamatan & Kelurahan (JSON)"]);
    sheetCakupan.getRange("A1:D1").setFontWeight("bold").setBackground("#0d9488").setFontColor("#ffffff");
    sheetCakupan.setFrozenRows(1);

    var defaultCov = [
      [1, "Jakarta Selatan", "Kota", JSON.stringify([{ name: "Kebayoran Baru", kelurahans: [{ name: "Rawa Barat", status: "active", nodesCount: 12 }, { name: "Selong", status: "active", nodesCount: 8 }, { name: "Melawai", status: "active", nodesCount: 15 }] }, { name: "Cilandak", kelurahans: [{ name: "Cipete Selatan", status: "active", nodesCount: 14 }, { name: "Pondok Labu", status: "active", nodesCount: 22 }] }])],
      [2, "Depok", "Kota", JSON.stringify([{ name: "Beji", kelurahans: [{ name: "Pondok Cina", status: "active", nodesCount: 32 }, { name: "Kemiri Muka", status: "active", nodesCount: 18 }] }, { name: "Cinere", kelurahans: [{ name: "Cinere", status: "active", nodesCount: 20 }] }])],
      [3, "Tangerang Selatan", "Kota", JSON.stringify([{ name: "Serpong", kelurahans: [{ name: "Lengkong Gudang", status: "active", nodesCount: 24 }, { name: "Serpong", status: "active", nodesCount: 18 }] }])],
      [4, "Bogor", "Kota", JSON.stringify([{ name: "Bogor Timur", kelurahans: [{ name: "Baranangsiang", status: "active", nodesCount: 19 }, { name: "Katulampa", status: "active", nodesCount: 28 }] }])],
      [5, "Ciomas (Bogor)", "Kabupaten", JSON.stringify([{ name: "Ciomas", kelurahans: [{ name: "Ciomas Rahayu", status: "active", nodesCount: 24 }, { name: "Pagelaran", status: "active", nodesCount: 31 }] }])]
    ];
    for (var c = 0; c < defaultCov.length; c++) {
      sheetCakupan.appendRow(defaultCov[c]);
    }
  }

  // H. Hapus Sheet1 / Lembar1 bawaan yang kosong agar rapi
  var defaultSheet1 = ss.getSheetByName("Sheet1") || ss.getSheetByName("Lembar1");
  if (defaultSheet1 && ss.getSheets().length > 1 && defaultSheet1.getLastRow() === 0) {
    try {
      ss.deleteSheet(defaultSheet1);
    } catch (e) {}
  }

  Logger.log("✅ SUKSES! Seluruh 6 Sheet (Pelanggan, Pembayaran, Tiket, Pengaturan, Paket, Cakupan) dan Folder Google Drive 'PatasNet_Drive' telah berhasil dibuat secara otomatis!");
  return "Database Patas Net Siap Digunakan!";
}

// Alias kompatibilitas
function setupHeaders() {
  return setupDatabaseOtomatis();
}

// Otomatis menambahkan menu di Google Spreadsheet saat dibuka
function onOpen() {
  try {
    setupDatabaseOtomatis();
    SpreadsheetApp.getUi()
      .createMenu("⚡ Database Patas Net")
      .addItem("Buat / Periksa Semua Sheet & Folder Drive Otomatis", "setupDatabaseOtomatis")
      .addToUi();
  } catch (e) {}
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    var existing = folders.next();
    try {
      existing.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    return existing;
  }
  var newFolder = DriveApp.createFolder(folderName);
  try {
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  return newFolder;
}

function getOrCreateSubFolder(parentFolder, subFolderName) {
  var folders = parentFolder.getFoldersByName(subFolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var sub = parentFolder.createFolder(subFolderName);
  try {
    sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  return sub;
}

function saveBase64ToDrive(base64String, fileName, subFolderName) {
  try {
    if (!base64String || typeof base64String !== "string") return "";
    if (base64String.indexOf("http://") === 0 || base64String.indexOf("https://") === 0) {
      return base64String;
    }
    var mainFolder = getOrCreateFolder("PatasNet_Drive");
    var targetFolder = subFolderName ? getOrCreateSubFolder(mainFolder, subFolderName) : mainFolder;
    var mime = "image/png";
    var base64Data = base64String;

    if (base64String.indexOf(",") !== -1) {
      var parts = base64String.split(",");
      if (parts[0].indexOf(":") !== -1 && parts[0].indexOf(";") !== -1) {
        mime = parts[0].split(":")[1].split(";")[0];
      }
      base64Data = parts[1];
    }

    var data = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(data, mime, fileName);
    var file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    // Link langsung gambar Google Drive agar tampil cepat di semua HP & PC
    return "https://lh3.googleusercontent.com/d/" + fileId;
  } catch (err) {
    return "";
  }
}

// 2. ENDPOINT GET (Otomatis membuat semua sheet jika baru saja di-deploy lalu mengambil seluruh data & gambar)
function doGet(e) {
  try {
    setupDatabaseOtomatis();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPelanggan = ss.getSheetByName("Pelanggan");
    var sheetPembayaran = ss.getSheetByName("Pembayaran");
    var sheetTiket = ss.getSheetByName("Tiket");
    var sheetPengaturan = ss.getSheetByName("Pengaturan");
    var sheetPaket = ss.getSheetByName("Paket");
    var sheetCakupan = ss.getSheetByName("Cakupan");

    var customers = [];
    if (sheetPelanggan && sheetPelanggan.getLastRow() > 1) {
      var data = sheetPelanggan.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[1]) {
          var coords = [-6.2088, 106.8456];
          if (row[6] && String(row[6]).indexOf(",") !== -1) {
            var parts = String(row[6]).split(",");
            coords = [parseFloat(parts[0]), parseFloat(parts[1])];
          }
          customers.push({
            id: String(row[1]),
            name: String(row[2]),
            email: String(row[3]),
            phone: String(row[4]),
            address: String(row[5]),
            coordinates: coords,
            packageId: String(row[7] || "home-20m"),
            status: String(row[8] || "active").toLowerCase(),
            ktpImageUrl: String(row[9] || ""),
            createdAt: row[0] ? new Date(row[0]).toISOString() : new Date().toISOString(),
            payments: []
          });
        }
      }
    }

    if (sheetPembayaran && sheetPembayaran.getLastRow() > 1) {
      var payData = sheetPembayaran.getDataRange().getValues();
      for (var j = 1; j < payData.length; j++) {
        var pRow = payData[j];
        var custId = String(pRow[2]);
        var cust = customers.find(function(c) { return c.id === custId; });
        if (cust) {
          cust.payments.push({
            id: String(pRow[1]),
            date: pRow[0] ? Utilities.formatDate(new Date(pRow[0]), Session.getScriptTimeZone(), "yyyy-MM-dd") : "",
            amount: Number(pRow[4]) || 0,
            billingPeriod: String(pRow[5] || "Tagihan Berjalan"),
            method: String(pRow[6] || "Transfer Bank"),
            status: String(pRow[7] || "unpaid").toLowerCase(),
            proofOfPaymentUrl: String(pRow[8] || ""),
            transactionId: String(pRow[9] || "")
          });
        }
      }
    }

    var tickets = [];
    if (sheetTiket && sheetTiket.getLastRow() > 1) {
      var tData = sheetTiket.getDataRange().getValues();
      for (var k = 1; k < tData.length; k++) {
        var tRow = tData[k];
        if (tRow[1]) {
          tickets.push({
            id: String(tRow[1]),
            userId: String(tRow[2]),
            userName: String(tRow[3]),
            phone: String(tRow[4]),
            message: String(tRow[5]),
            status: String(tRow[6] || "open").toLowerCase(),
            date: tRow[0] ? Utilities.formatDate(new Date(tRow[0]), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm") : ""
          });
        }
      }
    }

    var settings = {
      name: "PATAS NET",
      logoText: "PATAS NET",
      logoUrl: "",
      qrisUrl: "",
      promos: [],
      address: "Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110",
      themeColor: "#2563eb",
      phoneNumber: "+62 899-3299-977",
      whatsappNumber: "0812-3456-7890"
    };
    if (sheetPengaturan && sheetPengaturan.getLastRow() > 1) {
      var sData = sheetPengaturan.getDataRange().getValues();
      for (var s = 1; s < sData.length; s++) {
        var key = String(sData[s][0]).trim();
        var val = String(sData[s][1] || "");
        if (val === "#ERROR!" || val === "#VALUE!" || val === "#NAME?") {
          val = key === "phoneNumber" ? "+62 899-3299-977" : (key === "whatsappNumber" ? "0812-3456-7890" : "");
          try {
            sheetPengaturan.getRange(s + 1, 2).setNumberFormat("@").setValue(val);
          } catch (e) {}
        }
        if (key) {
          if (key === "qrisAutoVerify") {
            settings[key] = (val === "true" || val === "TRUE" || val === "1");
          } else if (key === "promos") {
            try {
              settings.promos = JSON.parse(val || "[]");
            } catch (e) {
              settings.promos = [];
            }
          } else {
            settings[key] = val;
          }
        }
      }
    }

    var packages = [];
    if (sheetPaket && sheetPaket.getLastRow() > 1) {
      var pkgData = sheetPaket.getDataRange().getValues();
      for (var p = 1; p < pkgData.length; p++) {
        var pkgRow = pkgData[p];
        if (pkgRow[0]) {
          var parsedFeatures = [];
          try {
            parsedFeatures = JSON.parse(pkgRow[6] || "[]");
          } catch (e) {}
          packages.push({
            id: String(pkgRow[0]),
            name: String(pkgRow[1]),
            speed: String(pkgRow[2]),
            price: Number(pkgRow[3]) || 0,
            type: String(pkgRow[4] || "home"),
            popular: pkgRow[5] === true || String(pkgRow[5]).toLowerCase() === "true",
            features: parsedFeatures
          });
        }
      }
    }

    var coverage = [];
    if (sheetCakupan && sheetCakupan.getLastRow() > 1) {
      var covData = sheetCakupan.getDataRange().getValues();
      for (var c = 1; c < covData.length; c++) {
        var covRow = covData[c];
        if (covRow[1]) {
          var kecs = [];
          try {
            kecs = JSON.parse(covRow[3] || "[]");
          } catch (e) {}
          var totalKel = 0;
          for (var kc = 0; kc < kecs.length; kc++) {
            totalKel += (kecs[kc].kelurahans ? kecs[kc].kelurahans.length : 0);
          }
          coverage.push({
            id: Number(covRow[0]) || c,
            cityName: String(covRow[1]),
            regionType: String(covRow[2] || "Kota"),
            totalKecamatan: kecs.length,
            totalKelurahan: totalKel,
            kecamatans: kecs
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      customers: customers,
      tickets: tickets,
      settings: settings,
      packages: packages,
      coverage: coverage,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper sinkronisasi penuh Sheet Paket (otomatis menambah & menghapus paket sesuai website)
function syncSheetPaketData(ss, packagesList) {
  if (!Array.isArray(packagesList)) return;
  var sheetPaket = ss.getSheetByName("Paket");
  if (!sheetPaket) return;
  var lastRow = sheetPaket.getLastRow();
  if (lastRow > 1) {
    sheetPaket.getRange(2, 1, lastRow - 1, 7).clearContent();
  }
  for (var i = 0; i < packagesList.length; i++) {
    var p = packagesList[i];
    sheetPaket.appendRow([
      String(p.id || ("pkg-" + (i + 1))),
      String(p.name || ""),
      String(p.speed || ""),
      Number(p.price) || 0,
      String(p.type || "home"),
      Boolean(p.popular),
      JSON.stringify(Array.isArray(p.features) ? p.features : [])
    ]);
  }
}

// Helper sinkronisasi penuh Sheet Cakupan (otomatis menambah & menghapus wilayah sesuai website)
function syncSheetCakupanData(ss, coverageList) {
  if (!Array.isArray(coverageList)) return;
  var sheetCakupan = ss.getSheetByName("Cakupan");
  if (!sheetCakupan) return;
  var lastRow = sheetCakupan.getLastRow();
  if (lastRow > 1) {
    sheetCakupan.getRange(2, 1, lastRow - 1, 4).clearContent();
  }
  for (var i = 0; i < coverageList.length; i++) {
    var c = coverageList[i];
    sheetCakupan.appendRow([
      Number(c.id) || (i + 1),
      String(c.cityName || ""),
      String(c.regionType || "Kota"),
      JSON.stringify(Array.isArray(c.kecamatans) ? c.kecamatans : [])
    ]);
  }
}

// 3. ENDPOINT POST (Menyimpan perubahan data ke Sheet & mengunggah Gambar ke Google Drive)
function doPost(e) {
  try {
    setupDatabaseOtomatis();
    var rawBody = JSON.parse(e.postData.contents);
    var payload = {};
    if (rawBody && typeof rawBody.data === "object" && rawBody.data !== null) {
      for (var dk in rawBody.data) {
        payload[dk] = rawBody.data[dk];
      }
    }
    for (var rk in rawBody) {
      if (rk !== "data") payload[rk] = rawBody[rk];
    }
    var action = payload.action || "subscribe";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "subscribe") {
      var sheet = ss.getSheetByName("Pelanggan");
      var ktpUrl = payload.ktpImageUrl || "";
      if (payload.ktpImageBase64 || (payload.ktpImageUrl && String(payload.ktpImageUrl).indexOf("data:") === 0)) {
        var uploadedKtp = saveBase64ToDrive(payload.ktpImageBase64 || payload.ktpImageUrl, "KTP_" + (payload.name || "user") + "_" + (payload.id || Date.now()) + ".jpg", "KTP_Pelanggan");
        if (uploadedKtp) ktpUrl = uploadedKtp;
      }

      var newCustId = payload.id || ("TR-" + Math.floor(1000 + Math.random() * 9000));
      var safePhone = String(payload.phone || "");
      if (safePhone.indexOf("+") === 0 || safePhone.indexOf("=") === 0) {
        safePhone = "'" + safePhone;
      }
      sheet.appendRow([
        new Date(),
        newCustId,
        payload.name || "",
        payload.email || "",
        safePhone,
        payload.address || "",
        Array.isArray(payload.coordinates) ? payload.coordinates.join(", ") : (payload.coordinates || "-6.2088, 106.8456"),
        payload.packageId || "home-20m",
        payload.status || "pending",
        ktpUrl,
        payload.password || "user123"
      ]);

      var sheetPay = ss.getSheetByName("Pembayaran");
      var payId = payload.paymentId || ("PAY-" + Math.floor(7000 + Math.random() * 9000));
      sheetPay.appendRow([
        new Date(),
        payId,
        newCustId,
        payload.name || "",
        payload.amount || 170000,
        payload.billingPeriod || "Bulan Pertama",
        "QRIS / Transfer",
        "unpaid",
        "",
        ""
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Data pelanggan berhasil disimpan di Google Sheet & Google Drive!",
        ktpUrl: ktpUrl,
        id: newCustId
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "submit_payment_proof") {
      var sheetPay = ss.getSheetByName("Pembayaran");
      var proofUrl = payload.proofUrl || payload.proofOfPaymentUrl || "";
      var proofData = payload.proofBase64 || payload.proofOfPaymentUrlBase64 || (String(proofUrl).indexOf("data:") === 0 ? proofUrl : "");
      if (proofData) {
        var uploadedProof = saveBase64ToDrive(proofData, "BUKTI_" + (payload.userId || "cust") + "_" + payload.paymentId + ".jpg", "Bukti_Pembayaran");
        if (uploadedProof) proofUrl = uploadedProof;
      }

      var data = sheetPay.getDataRange().getValues();
      var updated = false;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(payload.paymentId)) {
          sheetPay.getRange(i + 1, 8).setValue("pending_verification");
          if (proofUrl) sheetPay.getRange(i + 1, 9).setValue(proofUrl);
          if (payload.method) sheetPay.getRange(i + 1, 7).setValue(payload.method);
          updated = true;
          break;
        }
      }
      if (!updated) {
        sheetPay.appendRow([
          new Date(),
          payload.paymentId,
          payload.userId || "",
          payload.userName || "",
          payload.amount || 0,
          payload.billingPeriod || "Berjalan",
          payload.method || "Transfer",
          "pending_verification",
          proofUrl,
          ""
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Bukti pembayaran tersimpan di Google Drive & Google Sheet!",
        proofUrl: proofUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update_status") {
      var sheet = ss.getSheetByName("Pelanggan");
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(payload.id)) {
          sheet.getRange(i + 1, 9).setValue(payload.status);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "delete_customer") {
      var targetId = String(payload.id);
      var sheetPel = ss.getSheetByName("Pelanggan");
      if (sheetPel && sheetPel.getLastRow() > 1) {
        var pRows = sheetPel.getDataRange().getValues();
        for (var r = pRows.length - 1; r >= 1; r--) {
          if (String(pRows[r][1]) === targetId) sheetPel.deleteRow(r + 1);
        }
      }
      var sheetPayDel = ss.getSheetByName("Pembayaran");
      if (sheetPayDel && sheetPayDel.getLastRow() > 1) {
        var payRows = sheetPayDel.getDataRange().getValues();
        for (var pr = payRows.length - 1; pr >= 1; pr--) {
          if (String(payRows[pr][2]) === targetId) sheetPayDel.deleteRow(pr + 1);
        }
      }
      var sheetTikDel = ss.getSheetByName("Tiket");
      if (sheetTikDel && sheetTikDel.getLastRow() > 1) {
        var tikRows = sheetTikDel.getDataRange().getValues();
        for (var tr = tikRows.length - 1; tr >= 1; tr--) {
          if (String(tikRows[tr][2]) === targetId) sheetTikDel.deleteRow(tr + 1);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update_packages" || action === "sync_packages") {
      var pkgList = payload.packages;
      if (!Array.isArray(pkgList) && payload.packagesJson) {
        try { pkgList = JSON.parse(payload.packagesJson); } catch (e) {}
      }
      if (Array.isArray(pkgList)) {
        syncSheetPaketData(ss, pkgList);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Sheet Paket berhasil diperbarui!" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update_coverage" || action === "sync_coverage") {
      var covList = payload.coverage;
      if (!Array.isArray(covList) && payload.coverageJson) {
        try { covList = JSON.parse(payload.coverageJson); } catch (e) {}
      }
      if (Array.isArray(covList)) {
        syncSheetCakupanData(ss, covList);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Sheet Cakupan berhasil diperbarui!" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "approve_payment") {
      var sheetPay = ss.getSheetByName("Pembayaran");
      var data = sheetPay.getDataRange().getValues();
      var custIdToActivate = payload.userId || payload.customerId || "";
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(payload.paymentId)) {
          sheetPay.getRange(i + 1, 8).setValue("paid");
          if (payload.method) sheetPay.getRange(i + 1, 7).setValue(payload.method);
          if (payload.transactionId) sheetPay.getRange(i + 1, 10).setValue(payload.transactionId);
          if (!custIdToActivate) custIdToActivate = String(data[i][2]);
          break;
        }
      }
      if (custIdToActivate) {
        var sheetPel = ss.getSheetByName("Pelanggan");
        var cData = sheetPel.getDataRange().getValues();
        for (var c = 1; c < cData.length; c++) {
          if (String(cData[c][1]) === String(custIdToActivate)) {
            sheetPel.getRange(c + 1, 9).setValue("active");
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "reject_payment") {
      var sheetPay = ss.getSheetByName("Pembayaran");
      var data = sheetPay.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(payload.paymentId)) {
          sheetPay.getRange(i + 1, 8).setValue("unpaid");
          sheetPay.getRange(i + 1, 9).setValue("");
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "create_ticket" || action === "submit_ticket") {
      var sheetTik = ss.getSheetByName("Tiket");
      var safeTPhone = String(payload.phone || "");
      if (safeTPhone.indexOf("+") === 0 || safeTPhone.indexOf("=") === 0) {
        safeTPhone = "'" + safeTPhone;
      }
      sheetTik.appendRow([
        new Date(),
        payload.id || ("TCK-" + Math.floor(1000 + Math.random() * 9000)),
        payload.userId || "",
        payload.userName || "",
        safeTPhone,
        payload.message || "",
        payload.status || "open"
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update_ticket_status") {
      var sheetTik = ss.getSheetByName("Tiket");
      var tRows = sheetTik.getDataRange().getValues();
      for (var tIdx = 1; tIdx < tRows.length; tIdx++) {
        if (String(tRows[tIdx][1]) === String(payload.id)) {
          sheetTik.getRange(tIdx + 1, 7).setValue(payload.status || "resolved");
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update_settings" || action === "update_logo" || action === "update_qris") {
      var sheetPeng = ss.getSheetByName("Pengaturan");
      sheetPeng.getRange("B:B").setNumberFormat("@");
      var finalLogoUrl = payload.logoUrl || "";
      var logoData = payload.logoBase64 || (payload.logoUrl && String(payload.logoUrl).indexOf("data:") === 0 ? payload.logoUrl : "");
      if (logoData) {
        var uploadedLogo = saveBase64ToDrive(logoData, "LOGO_PATASNET_" + Date.now() + ".png", "Logo_dan_QRIS");
        if (uploadedLogo) finalLogoUrl = uploadedLogo;
      }

      var finalQrisUrl = payload.qrisUrl || "";
      var qrisData = payload.qrisBase64 || (payload.qrisUrl && String(payload.qrisUrl).indexOf("data:") === 0 ? payload.qrisUrl : "");
      if (qrisData) {
        var uploadedQris = saveBase64ToDrive(qrisData, "QRIS_PATASNET_" + Date.now() + ".png", "Logo_dan_QRIS");
        if (uploadedQris) finalQrisUrl = uploadedQris;
      }

      var finalPromosJson = undefined;
      if (Array.isArray(payload.promos)) {
        var uploadedPromos = [];
        for (var pr = 0; pr < payload.promos.length; pr++) {
          var pItem = payload.promos[pr];
          if (pItem && String(pItem).indexOf("data:") === 0) {
            var drivePromo = saveBase64ToDrive(pItem, "PROMO_PATASNET_" + Date.now() + "_" + pr + ".jpg", "Banner_Promo");
            uploadedPromos.push(drivePromo || pItem);
          } else if (pItem) {
            uploadedPromos.push(pItem);
          }
        }
        finalPromosJson = JSON.stringify(uploadedPromos);
      }

      var sData = sheetPeng.getDataRange().getValues();
      var keysToUpdate = {
        name: payload.name,
        logoText: payload.logoText,
        logoUrl: finalLogoUrl || payload.logoUrl,
        qrisUrl: finalQrisUrl || payload.qrisUrl,
        qrisMerchantName: payload.qrisMerchantName,
        qrisNmid: payload.qrisNmid,
        qrisAutoVerify: payload.qrisAutoVerify !== undefined ? String(payload.qrisAutoVerify) : undefined,
        qrisInstructions: payload.qrisInstructions,
        address: payload.address,
        themeColor: payload.themeColor,
        tagline: payload.tagline,
        coverageText: payload.coverageText,
        legalName: payload.legalName,
        whatsappNumber: payload.whatsappNumber,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        instagramUrl: payload.instagramUrl,
        facebookUrl: payload.facebookUrl,
        youtubeUrl: payload.youtubeUrl,
        promos: finalPromosJson,
        heroSlides: Array.isArray(payload.heroSlides) ? JSON.stringify(payload.heroSlides) : undefined,
        packagesJson: payload.packagesJson,
        coverageJson: payload.coverageJson,
        whatsappConfigJson: payload.whatsappConfigJson
      };

      for (var key in keysToUpdate) {
        if (keysToUpdate[key] !== undefined && keysToUpdate[key] !== null && String(keysToUpdate[key]).trim() !== "") {
          var strVal = String(keysToUpdate[key]);
          var found = false;
          for (var r = 1; r < sData.length; r++) {
            if (String(sData[r][0]).trim() === key) {
              var cell = sheetPeng.getRange(r + 1, 2);
              cell.setNumberFormat("@");
              cell.setValue(strVal);
              sheetPeng.getRange(r + 1, 3).setValue(new Date());
              found = true;
              break;
            }
          }
          if (!found) {
            var safeAppendVal = (strVal.indexOf("+") === 0 || strVal.indexOf("=") === 0) ? ("'" + strVal) : strVal;
            sheetPeng.appendRow([key, safeAppendVal, new Date()]);
          }
        }
      }

      // Sinkronkan juga ke Sheet Paket & Sheet Cakupan apabila packagesJson / coverageJson ikut diperbarui
      if (payload.packagesJson) {
        try {
          var parsedPkgs = JSON.parse(payload.packagesJson);
          if (Array.isArray(parsedPkgs)) syncSheetPaketData(ss, parsedPkgs);
        } catch (e) {}
      }
      if (payload.coverageJson) {
        try {
          var parsedCov = JSON.parse(payload.coverageJson);
          if (Array.isArray(parsedCov)) syncSheetCakupanData(ss, parsedCov);
        } catch (e) {}
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Pengaturan identitas, Logo, QRIS, Paket & Cakupan berhasil diperbarui di Google Sheet & Google Drive!",
        logoUrl: finalLogoUrl || payload.logoUrl,
        qrisUrl: finalQrisUrl || payload.qrisUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "sync_all") {
      if (Array.isArray(payload.customers)) {
        var sheetPel = ss.getSheetByName("Pelanggan");
        var pelLast = sheetPel.getLastRow();
        if (pelLast > 1) {
          sheetPel.getRange(2, 1, pelLast - 1, 11).clearContent();
        }
        var sheetPayAll = ss.getSheetByName("Pembayaran");
        var payLast = sheetPayAll.getLastRow();
        if (payLast > 1) {
          sheetPayAll.getRange(2, 1, payLast - 1, 10).clearContent();
        }

        payload.customers.forEach(function(c) {
          var ktpDrive = c.ktpImageUrl || "";
          if (ktpDrive && String(ktpDrive).indexOf("data:") === 0) {
            ktpDrive = saveBase64ToDrive(ktpDrive, "KTP_" + (c.name || "user") + "_" + c.id + ".jpg", "KTP_Pelanggan");
          }
          var cPhone = String(c.phone || "");
          if (cPhone.indexOf("+") === 0 || cPhone.indexOf("=") === 0) cPhone = "'" + cPhone;
          sheetPel.appendRow([
            new Date(c.createdAt || Date.now()),
            c.id,
            c.name,
            c.email,
            cPhone,
            c.address,
            Array.isArray(c.coordinates) ? c.coordinates.join(", ") : "",
            c.packageId,
            c.status || "active",
            ktpDrive,
            "user123"
          ]);

          if (Array.isArray(c.payments)) {
            c.payments.forEach(function(p) {
              sheetPayAll.appendRow([
                p.date || new Date(),
                p.id,
                c.id,
                c.name,
                Number(p.amount) || 0,
                p.billingPeriod || "Tagihan Berjalan",
                p.method || "Transfer Bank",
                p.status || "unpaid",
                p.proofOfPaymentUrl || "",
                p.transactionId || ""
              ]);
            });
          }
        });
      }

      if (Array.isArray(payload.tickets)) {
        var sheetTikAll = ss.getSheetByName("Tiket");
        var tikLast = sheetTikAll.getLastRow();
        if (tikLast > 1) {
          sheetTikAll.getRange(2, 1, tikLast - 1, 7).clearContent();
        }
        payload.tickets.forEach(function(t) {
          var tPhone = String(t.phone || "");
          if (tPhone.indexOf("+") === 0 || tPhone.indexOf("=") === 0) tPhone = "'" + tPhone;
          sheetTikAll.appendRow([
            t.date || new Date(),
            t.id,
            t.userId || "",
            t.userName || "",
            tPhone,
            t.message || "",
            t.status || "open"
          ]);
        });
      }

      if (Array.isArray(payload.packages)) {
        syncSheetPaketData(ss, payload.packages);
      }
      if (Array.isArray(payload.coverage)) {
        syncSheetCakupanData(ss, payload.coverage);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Sinkronisasi penuh (tambah & hapus data) ke Google Sheet & Google Drive berhasil diselesaikan!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "unknown_action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export const STORAGE_SHEETS_CONFIG_KEY = 'patasnet_google_sheets_config_v2';

export interface GoogleSheetsConfig {
  webAppUrl: string;
  driveFolderName?: string;
  autoSync?: boolean;
  syncIntervalSeconds?: number;
  lastSyncedAt?: string;
}

export function getStoredSheetsConfig(): GoogleSheetsConfig {
  const defaultEnvUrl = getEnvOrDefaultSheetsUrl();
  try {
    const raw = localStorage.getItem(STORAGE_SHEETS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        webAppUrl: parsed.webAppUrl || defaultEnvUrl,
      };
    }
    const legacyUrl = localStorage.getItem('patasnet_google_sheets_url');
    if (legacyUrl) {
      return { webAppUrl: legacyUrl, driveFolderName: 'PatasNet_Drive', autoSync: true, syncIntervalSeconds: 3 };
    }
  } catch {
    // ignore
  }
  return { webAppUrl: defaultEnvUrl, driveFolderName: 'PatasNet_Drive', autoSync: true, syncIntervalSeconds: 3 };
}

export function saveStoredSheetsConfig(config: GoogleSheetsConfig): void {
  try {
    localStorage.setItem(STORAGE_SHEETS_CONFIG_KEY, JSON.stringify(config));
    if (config.webAppUrl) {
      localStorage.setItem('patasnet_google_sheets_url', config.webAppUrl);
    }
  } catch {
    // ignore
  }
}

export async function pingGoogleSheets(url: string): Promise<{ success: boolean; message: string; data?: any }> {
  if (!url) return { success: false, message: 'URL Google Sheets belum diisi' };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        return {
          success: true,
          message: `Koneksi Google Sheets & Drive Berhasil! Ditemukan ${data.customers?.length || 0} pelanggan, ${data.tickets?.length || 0} tiket.`,
          data
        };
      }
    }
    return { success: false, message: 'Respon dari Google Sheets tidak valid atau izin Web App belum diatur ke "Anyone".' };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi Google Sheets: ${err.message || 'CORS / URL tidak valid'}` };
  }
}
