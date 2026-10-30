import { CompanySettings, CustomerUser, WifiPackage, WhatsAppApiConfig, WhatsAppBotRule } from '../types';
import { getLocalCustomers, getLocalPackages, getLocalCoverage, getLocalSettings } from './clientFallback';

const WA_CONFIG_STORAGE_KEY = 'patasnet_whatsapp_config_v1';
const WA_LOGS_STORAGE_KEY = 'patasnet_whatsapp_logs_v1';

export interface WhatsAppLogEntry {
  id: string;
  time: string;
  phone: string;
  type: 'admin_notif' | 'customer_welcome' | 'test' | 'reminder' | 'bot_autoreply';
  provider: string;
  status: 'sent' | 'fallback_link' | 'failed';
  message: string;
  detail?: string;
}

export const DEFAULT_BOT_RULES: WhatsAppBotRule[] = [
  {
    id: 'rule-menu',
    keywords: 'halo, hai, ping, menu, info, bot, bantuan, assalamualaikum, pagi, siang, sore, malam',
    reply: `Halo Kak! 👋 Selamat datang di layanan Asisten Bot Otomatis *{{company_name}}* (24 Jam).

Silakan ketik salah satu kata kunci berikut untuk mendapatkan informasi instan:
1️⃣ Ketik *PAKET* — Lihat daftar paket WiFi & harga bulanan terbaru
2️⃣ Ketik *CAKUPAN* — Cek daftar wilayah/area yang tercover jaringan
3️⃣ Ketik *TAGIHAN* atau *TR-XXXX* — Cek status tagihan & akun Anda
4️⃣ Ketik *BAYAR* — Panduan pembayaran instan via QRIS / Transfer
5️⃣ Ketik *PASANG* — Info syarat & cara daftar pemasangan baru
6️⃣ Ketik *GANGGUAN* — Solusi cepat kendala WiFi & lapor teknisi

Atau langsung tulis pertanyaan Anda, Bot kami siap membantu! 🤖✨`,
    active: true,
  },
  {
    id: 'rule-paket',
    keywords: 'paket, harga, biaya, tarif, mbps, kecepatan, langganan, promo, murah',
    reply: `📦 *DAFTAR PAKET INTERNET FIBER OPTIK {{company_name}}*
100% Fiber Optik Murni • Tanpa FUP (Unlimited) • Gratis Biaya Pasang!

{{packages_list}}

📌 *Cara Daftar Cepat:*
Buka website resmi kami dan pilih menu *Daftar Sekarang*, atau balas pesan ini dengan *NAMA # ALAMAT LENGKAP # PAKET* untuk dibantu registrasi oleh tim kami.`,
    active: true,
  },
  {
    id: 'rule-cakupan',
    keywords: 'cakupan, area, wilayah, lokasi, kota, kecamatan, kelurahan, tercover, jaringan, odp',
    reply: `📍 *AREA CAKUPAN JARINGAN FIBER OPTIK {{company_name}}*

Saat ini jaringan kami telah aktif mencakup wilayah berikut:
{{coverage_list}}

Untuk memastikan ketersediaan tiang/ODP tepat di depan rumah Anda, silakan kirimkan *Share Lokasi (Shareloc)* atau daftar langsung melalui peta interaktif di website kami!`,
    active: true,
  },
  {
    id: 'rule-bayar',
    keywords: 'bayar, pembayaran, qris, transfer, rekening, lunas, konfirmasi',
    reply: `💳 *PANDUAN PEMBAYARAN TAGIHAN {{company_name}}*

Anda dapat melakukan pembayaran tagihan bulanan dengan mudah:
1. Login ke *Portal Pelanggan* di website *{{company_name}}*.
2. Pilih menu *Tagihan & Pembayaran*.
3. Scan barcode *QRIS Resmi* (mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay) untuk verifikasi *Lunas Otomatis*, atau unggah bukti Transfer Bank.

Ketik *TAGIHAN* atau *ID Pelanggan* Anda (contoh: *TR-1001*) untuk mengecek nominal tagihan Anda saat ini.`,
    active: true,
  },
  {
    id: 'rule-pasang',
    keywords: 'pasang, daftar, registrasi, syarat, instalasi, baru, ktp',
    reply: `🚀 *INFO PEMASANGAN BARU {{company_name}}*

✅ *Biaya Instalasi:* GRATIS 100% (Rp 0)
✅ *Syarat Pendaftaran:*
• Nama Lengkap & Foto KTP
• Nomor WhatsApp Aktif
• Titik Koordinat Lokasi Pemasangan (Google Maps)

Silakan isi formulir pendaftaran langsung di website kami. Begitu selesai mendaftar, pesan konfirmasi & ID Pelanggan akan langsung dikirim otomatis ke WhatsApp Anda!`,
    active: true,
  },
  {
    id: 'rule-gangguan',
    keywords: 'gangguan, lemot, lambat, mati, los, merah, rusak, komplain, tiket, teknisi, putus',
    reply: `🛠️ *BANTUAN KENDALA & TEKNISI {{company_name}}*

Jika koneksi internet Anda mengalami kendala:
1️⃣ *Langkah Pertama:* Matikan modem/router WiFi selama *3 menit*, lalu nyalakan kembali (Refresh IP Optik).
2️⃣ *Indikator LOS Merah:* Pastikan kabel fiber kuning/hitam yang masuk ke modem tidak tertekuk tajam atau longgar.
3️⃣ *Buat Tiket Teknisi:* Login ke *Portal Pelanggan* di website lalu kirim laporan pada menu *Tiket Bantuan* agar teknisi segera meluncur ke rumah Anda.

Hubungi Admin Teknis darurat: *{{admin_phone}}*`,
    active: true,
  },
];

export const DEFAULT_BOT_FALLBACK_REPLY = `🤖 *Asisten Bot Otomatis {{company_name}}*

Terima kasih atas pesan Anda! Pertanyaan Anda telah kami terima.

Untuk balasan otomatis instan, Anda juga dapat mengetik kata kunci berikut:
• *PAKET* — Info harga & pilihan paket WiFi
• *CAKUPAN* — Cek area jangkauan jaringan
• *TAGIHAN* — Cek status tagihan bulanan Anda
• *BAYAR* — Cara pembayaran via QRIS / Transfer
• *GANGGUAN* — Panduan kendala & panggil teknisi

Tim Customer Service kami (*{{admin_phone}}*) juga akan segera meninjau pesan Anda. Terima kasih! 🙏`;

const DEFAULT_ADMIN_TEMPLATE = `🔔 *PENDAFTARAN PELANGGAN BARU - {{company_name}}* 🔔

Halo Admin, ada pendaftar pemasangan WiFi baru:

👤 *Nama Lengkap:* {{customer_name}}
🆔 *ID Pelanggan:* {{customer_id}}
📱 *No. WhatsApp:* {{customer_phone}}
📧 *Email:* {{customer_email}}
📦 *Paket Dipilih:* {{package_name}} ({{package_speed}})
💰 *Tagihan Pertama:* {{package_price}}
🏠 *Alamat Pemasangan:* {{customer_address}}
📍 *Titik Koordinat Maps:*
{{maps_link}}

📅 *Waktu Daftar:* {{date}}

Segera hubungi pelanggan untuk survei & jadwal instalasi.`;

const DEFAULT_CUSTOMER_TEMPLATE = `Halo Kak *{{customer_name}}*! 👋

Terima kasih telah mendaftar layanan internet fiber optik *{{company_name}}*. Pendaftaran Anda telah *BERHASIL* tercatat di sistem kami!

📋 *Bukti Registrasi Pelanggan:*
• *ID Pelanggan:* {{customer_id}}
• *Nama:* {{customer_name}}
• *Paket Dipilih:* {{package_name}} ({{package_speed}})
• *Tagihan Pertama:* {{package_price}}
• *Alamat Instalasi:* {{customer_address}}
• *Lokasi GPS Maps:* {{maps_link}}

👷 *Langkah Selanjutnya:*
Tim teknisi kami akan segera menghubungi nomor WhatsApp ini untuk konfirmasi jadwal survei & pemasangan di lokasi Anda.

🤖 *Layanan Bot WhatsApp 24 Jam:*
Jika ada pertanyaan kapan saja, Anda cukup membalas pesan ini dengan mengetik:
• *PAKET* (Info Paket & Harga)
• *TAGIHAN* (Cek Status Tagihan Anda)
• *BAYAR* (Cara Bayar QRIS Instan)
• *CAKUPAN* (Cek Wilayah Jaringan)
• *GANGGUAN* (Bantuan Teknis)

Terima kasih telah memilih *{{company_name}}*! 🙏`;

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppApiConfig = {
  enabled: true,
  provider: 'fonnte',
  apiKey: '',
  apiUrl: 'https://api.fonnte.com/send',
  endpointUrl: 'https://api.fonnte.com/send',
  instanceId: '',
  adminWhatsappNumber: '628993299977',
  adminPhone: '08993299977',
  sendToAdminOnNewCustomer: true,
  sendToAdminOnRegister: true,
  sendToCustomerOnNewCustomer: true,
  sendToCustomerOnRegister: true,
  autoOpenWaRedirectOnRegister: true,
  adminNewCustomerTemplate: DEFAULT_ADMIN_TEMPLATE,
  adminTemplate: DEFAULT_ADMIN_TEMPLATE,
  customerWelcomeTemplate: DEFAULT_CUSTOMER_TEMPLATE,
  customerTemplate: DEFAULT_CUSTOMER_TEMPLATE,
  botAutoReplyEnabled: true,
  botDefaultReply: DEFAULT_BOT_FALLBACK_REPLY,
  botRules: DEFAULT_BOT_RULES,
};

export function formatWhatsAppNumber(raw?: string): string {
  if (!raw) return '';
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (digits.startsWith('08')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  }
  return digits;
}

function normalizeWhatsAppConfigObject(raw: any, companySettings?: CompanySettings): WhatsAppApiConfig {
  const rawAdminPhone =
    raw?.adminPhone ||
    raw?.adminWhatsappNumber ||
    companySettings?.whatsappNumber ||
    DEFAULT_WHATSAPP_CONFIG.adminWhatsappNumber;
  const formattedAdmin = formatWhatsAppNumber(rawAdminPhone);

  const endpoint =
    raw?.endpointUrl ||
    raw?.apiUrl ||
    (raw?.provider === 'wablas'
      ? 'https://pati.wablas.com/api/send-message'
      : 'https://api.fonnte.com/send');

  const sendToAdmin =
    raw?.sendToAdminOnRegister !== undefined
      ? Boolean(raw.sendToAdminOnRegister)
      : raw?.sendToAdminOnNewCustomer !== undefined
      ? Boolean(raw.sendToAdminOnNewCustomer)
      : true;

  const sendToCustomer =
    raw?.sendToCustomerOnRegister !== undefined
      ? Boolean(raw.sendToCustomerOnRegister)
      : raw?.sendToCustomerOnNewCustomer !== undefined
      ? Boolean(raw.sendToCustomerOnNewCustomer)
      : true;

  const adminTpl =
    raw?.adminTemplate ||
    raw?.adminNewCustomerTemplate ||
    DEFAULT_WHATSAPP_CONFIG.adminNewCustomerTemplate;

  const customerTpl =
    raw?.customerTemplate ||
    raw?.customerWelcomeTemplate ||
    DEFAULT_WHATSAPP_CONFIG.customerWelcomeTemplate;

  const botRules =
    Array.isArray(raw?.botRules) && raw.botRules.length > 0
      ? raw.botRules
      : DEFAULT_BOT_RULES;

  return {
    ...DEFAULT_WHATSAPP_CONFIG,
    ...raw,
    enabled: raw?.enabled !== undefined ? Boolean(raw.enabled) : true,
    provider: raw?.provider || 'fonnte',
    apiKey: raw?.apiKey || '',
    apiUrl: endpoint,
    endpointUrl: endpoint,
    instanceId: raw?.instanceId || '',
    adminWhatsappNumber: formattedAdmin,
    adminPhone: raw?.adminPhone || formattedAdmin,
    sendToAdminOnNewCustomer: sendToAdmin,
    sendToAdminOnRegister: sendToAdmin,
    sendToCustomerOnNewCustomer: sendToCustomer,
    sendToCustomerOnRegister: sendToCustomer,
    autoOpenWaRedirectOnRegister:
      raw?.autoOpenWaRedirectOnRegister !== undefined
        ? Boolean(raw.autoOpenWaRedirectOnRegister)
        : true,
    adminNewCustomerTemplate: adminTpl,
    adminTemplate: adminTpl,
    customerWelcomeTemplate: customerTpl,
    customerTemplate: customerTpl,
    botAutoReplyEnabled:
      raw?.botAutoReplyEnabled !== undefined ? Boolean(raw.botAutoReplyEnabled) : true,
    botDefaultReply: raw?.botDefaultReply || DEFAULT_BOT_FALLBACK_REPLY,
    botRules,
  };
}

export function getWhatsAppConfig(companySettings?: CompanySettings): WhatsAppApiConfig {
  try {
    if (companySettings?.whatsappConfigJson) {
      const parsed = JSON.parse(companySettings.whatsappConfigJson);
      if (parsed && typeof parsed === 'object') {
        const merged = normalizeWhatsAppConfigObject(parsed, companySettings);
        localStorage.setItem(WA_CONFIG_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }

    const saved = localStorage.getItem(WA_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return normalizeWhatsAppConfigObject(parsed, companySettings);
    }
  } catch (e) {
    console.warn('Failed to parse WhatsApp config:', e);
  }

  return normalizeWhatsAppConfigObject({}, companySettings);
}

export function saveWhatsAppConfig(config: WhatsAppApiConfig): WhatsAppApiConfig {
  const normalized = normalizeWhatsAppConfigObject(config);
  try {
    localStorage.setItem(WA_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn('Failed to save WhatsApp config:', e);
  }
  return normalized;
}

export function getLocalWhatsAppLogs(): WhatsAppLogEntry[] {
  try {
    const raw = localStorage.getItem(WA_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function addLocalWhatsAppLog(entry: Omit<WhatsAppLogEntry, 'id' | 'time'>): WhatsAppLogEntry {
  const full: WhatsAppLogEntry = {
    ...entry,
    id: `WA-${Math.floor(1000 + Math.random() * 9000)}`,
    time: new Date().toLocaleTimeString('id-ID') + ' ' + new Date().toLocaleDateString('id-ID'),
  };
  try {
    const existing = getLocalWhatsAppLogs();
    const updated = [full, ...existing].slice(0, 50);
    localStorage.setItem(WA_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return full;
}

export function formatWhatsAppTemplate(
  template: string,
  variables: {
    customer_name: string;
    customer_id: string;
    customer_phone: string;
    customer_email?: string;
    customer_address: string;
    package_name: string;
    package_speed: string;
    package_price: string;
    maps_link: string;
    company_name: string;
    date?: string;
  }
): string {
  const dateStr =
    variables.date ||
    new Date().toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  return (template || '')
    .replace(/\{\{customer_name\}\}|\{customer_name\}|\{name\}/g, variables.customer_name || '-')
    .replace(/\{\{customer_id\}\}|\{customer_id\}|\{id\}/g, variables.customer_id || '-')
    .replace(/\{\{customer_phone\}\}|\{customer_phone\}|\{phone\}/g, variables.customer_phone || '-')
    .replace(/\{\{customer_email\}\}|\{customer_email\}|\{email\}/g, variables.customer_email || '-')
    .replace(/\{\{customer_address\}\}|\{customer_address\}|\{address\}/g, variables.customer_address || '-')
    .replace(/\{\{package_name\}\}|\{package_name\}/g, variables.package_name || '-')
    .replace(/\{\{package_speed\}\}|\{package_speed\}/g, variables.package_speed || '-')
    .replace(/\{\{package_price\}\}|\{package_price\}/g, variables.package_price || '-')
    .replace(/\{\{maps_link\}\}|\{maps_link\}/g, variables.maps_link || '-')
    .replace(/\{\{company_name\}\}|\{company_name\}/g, variables.company_name || 'Patas.Net')
    .replace(/\{\{date\}\}|\{date\}/g, dateStr);
}

export function generateNewCustomerWhatsAppUrl(
  customer: CustomerUser,
  pkg?: WifiPackage,
  companySettings?: CompanySettings
): {
  adminWaUrl: string;
  customerWaUrl: string;
  waRedirectUrl: string;
  adminMessage: string;
  customerMessage: string;
} {
  const config = getWhatsAppConfig(companySettings);
  const companyName = companySettings?.name || 'Patas.Net';

  const lat = Array.isArray(customer.coordinates) ? customer.coordinates[0] : -6.2088;
  const lng = Array.isArray(customer.coordinates) ? customer.coordinates[1] : 106.8456;
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

  const firstPaymentAmount = customer.payments?.[0]?.amount || pkg?.price || 0;
  const priceFormatted = firstPaymentAmount
    ? `Rp ${Number(firstPaymentAmount).toLocaleString('id-ID')}`
    : 'Sesuai Paket';

  const vars = {
    customer_name: customer.name,
    customer_id: customer.id,
    customer_phone: customer.phone || '-',
    customer_email: customer.email || '-',
    customer_address: customer.address || '-',
    package_name: pkg?.name || customer.packageId || 'Paket Internet',
    package_speed: pkg?.speed || '-',
    package_price: priceFormatted,
    maps_link: mapsLink,
    company_name: companyName,
  };

  const adminTpl = config.adminTemplate || config.adminNewCustomerTemplate || DEFAULT_ADMIN_TEMPLATE;
  const customerTpl = config.customerTemplate || config.customerWelcomeTemplate || DEFAULT_CUSTOMER_TEMPLATE;

  const adminMessage = formatWhatsAppTemplate(adminTpl, vars);
  const customerMessage = formatWhatsAppTemplate(customerTpl, vars);

  const adminPhone = formatWhatsAppNumber(
    config.adminPhone || config.adminWhatsappNumber || companySettings?.whatsappNumber || '628993299977'
  );
  const customerPhone = formatWhatsAppNumber(customer.phone || '');

  const adminWaUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(adminMessage)}`;
  const customerWaUrl = customerPhone
    ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(customerMessage)}`
    : '';

  return {
    adminWaUrl,
    customerWaUrl,
    waRedirectUrl: adminWaUrl,
    adminMessage,
    customerMessage,
  };
}

export async function sendWhatsAppMessageViaApi(
  targetPhone: string,
  message: string,
  config: WhatsAppApiConfig,
  logType: 'admin_notif' | 'customer_welcome' | 'test' | 'reminder' | 'bot_autoreply' = 'admin_notif'
): Promise<{
  ok: boolean;
  success: boolean;
  status: 'sent' | 'fallback_link' | 'failed';
  detail: string;
  message: string;
}> {
  const cleanTarget = formatWhatsAppNumber(targetPhone);
  if (!cleanTarget) {
    const msg = 'Nomor WhatsApp tujuan kosong atau tidak valid.';
    return { ok: false, success: false, status: 'failed', detail: msg, message: msg };
  }

  const token = (config.apiKey || '').trim();
  const endpointUrl = (config.endpointUrl || config.apiUrl || '').trim();

  if (!token) {
    const detail = 'Siap dikirim via tautan WhatsApp (Token API Gateway belum diisi, mode Direct WA aktif).';
    addLocalWhatsAppLog({
      phone: cleanTarget,
      type: logType,
      provider: `${config.provider.toUpperCase()} (Direct WA)`,
      status: 'fallback_link',
      message,
      detail,
    });
    return {
      ok: true,
      success: true,
      status: 'fallback_link',
      detail,
      message: detail,
    };
  }

  // 1. Direct browser call to Gateway API (works on Vercel static hosting & local)
  try {
    if (config.provider === 'fonnte') {
      const formData = new FormData();
      formData.append('target', cleanTarget);
      formData.append('message', message);
      formData.append('countryCode', '62');

      const res = await fetch(endpointUrl || 'https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status !== false) {
        const detail = data.detail || `Berhasil dikirim otomatis ke WhatsApp ${cleanTarget} via Fonnte API!`;
        addLocalWhatsAppLog({
          phone: cleanTarget,
          type: logType,
          provider: 'Fonnte API',
          status: 'sent',
          message,
          detail,
        });
        return { ok: true, success: true, status: 'sent', detail, message: detail };
      } else {
        throw new Error(data.reason || data.detail || `Fonnte HTTP ${res.status}`);
      }
    }

    if (config.provider === 'ultramsg') {
      const instance = (config.instanceId || '').trim();
      const endpoint =
        endpointUrl && endpointUrl.includes('ultramsg.com')
          ? endpointUrl
          : `https://api.ultramsg.com/${instance}/messages/chat`;

      const bodyParams = new URLSearchParams();
      bodyParams.append('token', token);
      bodyParams.append('to', `+${cleanTarget}`);
      bodyParams.append('body', message);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.sent === 'true' || data.sent === true || data.id)) {
        const detail = `Berhasil dikirim otomatis ke WhatsApp ${cleanTarget} via UltraMsg API!`;
        addLocalWhatsAppLog({
          phone: cleanTarget,
          type: logType,
          provider: 'UltraMsg API',
          status: 'sent',
          message,
          detail,
        });
        return { ok: true, success: true, status: 'sent', detail, message: detail };
      } else {
        throw new Error(data.error || `UltraMsg HTTP ${res.status}`);
      }
    }

    if (config.provider === 'wablas') {
      const endpoint = endpointUrl || 'https://pati.wablas.com/api/send-message';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanTarget,
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status !== false) {
        const detail = `Berhasil dikirim otomatis ke WhatsApp ${cleanTarget} via Wablas API!`;
        addLocalWhatsAppLog({
          phone: cleanTarget,
          type: logType,
          provider: 'Wablas API',
          status: 'sent',
          message,
          detail,
        });
        return { ok: true, success: true, status: 'sent', detail, message: detail };
      } else {
        throw new Error(data.message || `Wablas HTTP ${res.status}`);
      }
    }

    if (config.provider === 'custom') {
      if (!endpointUrl) throw new Error('URL Endpoint Custom API belum diisi.');
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: cleanTarget,
          phone: cleanTarget,
          to: cleanTarget,
          message,
          text: message,
        }),
      });
      if (res.ok) {
        const detail = `Berhasil dikirim otomatis ke WhatsApp ${cleanTarget} via Custom Webhook API!`;
        addLocalWhatsAppLog({
          phone: cleanTarget,
          type: logType,
          provider: 'Custom Webhook API',
          status: 'sent',
          message,
          detail,
        });
        return { ok: true, success: true, status: 'sent', detail, message: detail };
      } else {
        throw new Error(`Custom Webhook HTTP ${res.status}`);
      }
    }
  } catch (clientErr: any) {
    // 2. Fallback to server proxy /api/whatsapp/send
    try {
      const proxyRes = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPhone: cleanTarget,
          target: cleanTarget,
          message,
          config,
        }),
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.ok || proxyData.status === 'success') {
          const detail = proxyData.message || proxyData.detail || 'Berhasil dikirim via Server Proxy!';
          addLocalWhatsAppLog({
            phone: cleanTarget,
            type: logType,
            provider: `${config.provider.toUpperCase()} (Server Proxy)`,
            status: 'sent',
            message,
            detail,
          });
          return { ok: true, success: true, status: 'sent', detail, message: detail };
        }
      }
    } catch {}

    const errMsg = clientErr?.message || 'Gagal menghubungi server API WhatsApp';
    addLocalWhatsAppLog({
      phone: cleanTarget,
      type: logType,
      provider: config.provider.toUpperCase(),
      status: 'failed',
      message,
      detail: errMsg,
    });
    return { ok: false, success: false, status: 'failed', detail: errMsg, message: errMsg };
  }

  const unknownMsg = 'Provider tidak dikenali.';
  return { ok: false, success: false, status: 'failed', detail: unknownMsg, message: unknownMsg };
}

export async function notifyNewCustomerViaWhatsApp(
  customer: CustomerUser,
  pkg?: WifiPackage,
  companySettings?: CompanySettings
): Promise<{
  adminWaUrl: string;
  customerWaUrl: string;
  waRedirectUrl: string;
  adminSent: boolean;
  customerSent: boolean;
  apiSentToAdmin: boolean;
  apiSentToCustomer: boolean;
  adminMessage: string;
  customerMessage: string;
  statusDetail: string;
}> {
  const config = getWhatsAppConfig(companySettings);
  const { adminWaUrl, customerWaUrl, waRedirectUrl, adminMessage, customerMessage } =
    generateNewCustomerWhatsAppUrl(customer, pkg, companySettings);

  let apiSentToAdmin = false;
  let apiSentToCustomer = false;
  const details: string[] = [];

  const sendToCustomer = config.sendToCustomerOnRegister ?? config.sendToCustomerOnNewCustomer ?? true;
  const sendToAdmin = config.sendToAdminOnRegister ?? config.sendToAdminOnNewCustomer ?? true;
  const adminPhone = config.adminPhone || config.adminWhatsappNumber || companySettings?.whatsappNumber || '';

  if (config.enabled) {
    // 1. Send automatic WhatsApp welcome message to the Customer first
    if (sendToCustomer && customer.phone) {
      const custRes = await sendWhatsAppMessageViaApi(
        customer.phone,
        customerMessage,
        config,
        'customer_welcome'
      );
      apiSentToCustomer = custRes.status === 'sent';
      details.push(`WA Pelanggan (${customer.phone}): ${custRes.detail}`);
    }

    // 2. Send automatic WhatsApp notification to Admin
    if (sendToAdmin && adminPhone) {
      const adminRes = await sendWhatsAppMessageViaApi(
        adminPhone,
        adminMessage,
        config,
        'admin_notif'
      );
      apiSentToAdmin = adminRes.status === 'sent';
      details.push(`WA Admin (${adminPhone}): ${adminRes.detail}`);
    }
  }

  return {
    adminWaUrl,
    customerWaUrl,
    waRedirectUrl,
    adminSent: apiSentToAdmin,
    customerSent: apiSentToCustomer,
    apiSentToAdmin,
    apiSentToCustomer,
    adminMessage,
    customerMessage,
    statusDetail: details.join(' | ') || 'Pesan otomatis WhatsApp siap dikirim',
  };
}

/**
 * Generates an intelligent automatic reply from the Patas.Net WhatsApp Bot
 * based on customer questions, custom Admin rules, and live database records
 * (Packages, Coverage, Customer Billing & Status).
 */
export function generateWhatsAppBotReply(
  incomingMessage: string,
  senderPhone?: string,
  context?: {
    customers?: CustomerUser[];
    packages?: WifiPackage[];
    coverage?: any[];
    settings?: CompanySettings;
    config?: WhatsAppApiConfig;
  }
): { reply: string; matchedRuleId: string; matchedIntent: string } {
  const settings = context?.settings || getLocalSettings();
  const config = context?.config || getWhatsAppConfig(settings);
  const packages = context?.packages || getLocalPackages();
  const coverage = context?.coverage || getLocalCoverage();
  const customers = context?.customers || getLocalCustomers();

  const companyName = settings?.name || 'Patas.Net';
  const adminPhone =
    config.adminPhone || config.adminWhatsappNumber || settings?.whatsappNumber || '0899-3299-977';

  const packagesFormatted =
    packages.length > 0
      ? packages
          .map(
            (p, idx) =>
              `${idx + 1}. *${p.name}* (${p.speed}) — *Rp ${Number(p.price).toLocaleString('id-ID')}/bln*${
                p.popular ? ' ⭐ *Terlaris*' : ''
              }`
          )
          .join('\n')
      : '• Paket Home Fiber 20 Mbps — Rp 170.000/bln\n• Paket Super 50 Mbps — Rp 250.000/bln';

  const coverageFormatted =
    coverage.length > 0
      ? coverage
          .map((c: any) => {
            const kecNames = Array.isArray(c.kecamatans)
              ? c.kecamatans.map((k: any) => k.name).join(', ')
              : '';
            return `• *${c.regionType || 'Kota'} ${c.cityName}*${kecNames ? `: Kec. ${kecNames}` : ''}`;
          })
          .join('\n')
      : '• Area Layanan Aktif Fiber Optik';

  const replaceBotVars = (text: string) =>
    (text || '')
      .replace(/\{\{company_name\}\}|\{company_name\}/g, companyName)
      .replace(/\{\{packages_list\}\}|\{packages_list\}/g, packagesFormatted)
      .replace(/\{\{coverage_list\}\}|\{coverage_list\}/g, coverageFormatted)
      .replace(/\{\{admin_phone\}\}|\{admin_phone\}/g, adminPhone);

  const cleanText = (incomingMessage || '').trim();
  const lower = cleanText.toLowerCase();

  // 1. Check if customer is asking about a specific Customer ID (e.g. TR-1001) or "tagihan" / "status"
  const idMatch = cleanText.match(/TR-\d+/i);
  const isBillingQuery =
    Boolean(idMatch) ||
    lower.includes('tagihan') ||
    lower.includes('cek tagihan') ||
    lower.includes('status akun') ||
    lower.includes('status pendaftaran') ||
    lower.includes('invoice');

  if (isBillingQuery) {
    const cleanSender = formatWhatsAppNumber(senderPhone || '');
    let matchedCustomer: CustomerUser | undefined;

    if (idMatch) {
      const targetId = idMatch[0].toUpperCase();
      matchedCustomer = customers.find((c) => c.id.toUpperCase() === targetId);
    }
    if (!matchedCustomer && cleanSender) {
      matchedCustomer = customers.find(
        (c) => formatWhatsAppNumber(c.phone) === cleanSender
      );
    }

    if (matchedCustomer) {
      const pkg = packages.find((p) => p.id === matchedCustomer!.packageId);
      const latestPayment = matchedCustomer.payments?.[0];
      const statusLabel =
        matchedCustomer.status === 'active'
          ? '🟢 AKTIF (Terpasang)'
          : matchedCustomer.status === 'pending'
          ? '🟡 MENUNGGU INSTALASI / VERIFIKASI'
          : '🔴 TERISOLIR SEMENTARA';
      const payStatusLabel =
        latestPayment?.status === 'paid'
          ? '✅ LUNAS'
          : latestPayment?.status === 'pending_verification'
          ? '⏳ MENUNGGU VERIFIKASI ADMIN'
          : '⚠️ BELUM DIBAYAR';

      const reply = `🧾 *INFORMASI AKUN & TAGIHAN ${companyName.toUpperCase()}*

Halo Kak *${matchedCustomer.name}*, berikut rincian akun WiFi Anda secara real-time:

• *ID Pelanggan:* ${matchedCustomer.id}
• *Status Jaringan:* ${statusLabel}
• *Paket Internet:* ${pkg ? `${pkg.name} (${pkg.speed})` : matchedCustomer.packageId}
• *Periode Tagihan:* ${latestPayment?.billingPeriod || 'Bulan Berjalan'}
• *Nominal Tagihan:* Rp ${Number(latestPayment?.amount || pkg?.price || 0).toLocaleString('id-ID')}
• *Status Pembayaran:* ${payStatusLabel}

💡 *Ingin Bayar Instan via QRIS?*
Silakan login ke Portal Pelanggan di website *${companyName}* menggunakan email *${matchedCustomer.email}* atau ketik *BAYAR* untuk panduan lengkap.`;

      return { reply, matchedRuleId: 'dynamic-billing', matchedIntent: 'Cek Tagihan & Status Pelanggan' };
    } else if (idMatch) {
      return {
        reply: `🔍 Mohon maaf Kak, ID Pelanggan *${idMatch[0].toUpperCase()}* tidak ditemukan di sistem *${companyName}*.\n\nPastikan penulisan ID Pelanggan sudah benar (contoh: *TR-1001*) atau ketik *MENU* untuk melihat opsi bantuan lainnya.`,
        matchedRuleId: 'dynamic-billing-notfound',
        matchedIntent: 'ID Pelanggan Tidak Ditemukan',
      };
    }
  }

  // 2. Match against configured Bot Rules (Admin customizable)
  const rules = Array.isArray(config.botRules) && config.botRules.length > 0 ? config.botRules : DEFAULT_BOT_RULES;
  for (const rule of rules) {
    if (!rule.active) continue;
    const kwList = (rule.keywords || '')
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const isMatched = kwList.some((kw) => {
      if (lower === kw) return true;
      // Match whole word or substring for multi-char keywords
      return lower.includes(kw);
    });

    if (isMatched) {
      return {
        reply: replaceBotVars(rule.reply),
        matchedRuleId: rule.id,
        matchedIntent: `Kata Kunci: "${kwList.slice(0, 3).join(', ')}"`,
      };
    }
  }

  // 3. Fallback default reply
  const fallback = replaceBotVars(config.botDefaultReply || DEFAULT_BOT_FALLBACK_REPLY);
  return {
    reply: fallback,
    matchedRuleId: 'fallback-default',
    matchedIntent: 'Balasan Default Bot Otomatis',
  };
}

/**
 * Processes an incoming customer WhatsApp question and optionally sends the automated
 * bot reply back to the customer's WhatsApp via the configured Gateway API.
 */
export async function processIncomingWhatsAppBotMessage(
  senderPhone: string,
  incomingMessage: string,
  options?: {
    sendViaApi?: boolean;
    companySettings?: CompanySettings;
  }
): Promise<{
  reply: string;
  matchedIntent: string;
  apiSent: boolean;
  statusDetail: string;
}> {
  const settings = options?.companySettings || getLocalSettings();
  const config = getWhatsAppConfig(settings);
  const { reply, matchedIntent } = generateWhatsAppBotReply(incomingMessage, senderPhone, {
    settings,
    config,
  });

  let apiSent = false;
  let statusDetail = `Bot merespons otomatis (${matchedIntent})`;

  if (options?.sendViaApi && senderPhone && config.botAutoReplyEnabled !== false) {
    const sendRes = await sendWhatsAppMessageViaApi(senderPhone, reply, config, 'bot_autoreply');
    apiSent = sendRes.status === 'sent';
    statusDetail = `${matchedIntent} — ${sendRes.detail}`;
  } else if (senderPhone) {
    addLocalWhatsAppLog({
      phone: formatWhatsAppNumber(senderPhone),
      type: 'bot_autoreply',
      provider: 'Bot Auto-Reply',
      status: 'sent',
      message: `[Tanya: "${incomingMessage}"] -> ${reply.slice(0, 120)}...`,
      detail: statusDetail,
    });
  }

  return {
    reply,
    matchedIntent,
    apiSent,
    statusDetail,
  };
}
