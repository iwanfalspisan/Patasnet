import { CompanySettings, CustomerUser, WifiPackage, WhatsAppApiConfig } from '../types';

const WA_CONFIG_STORAGE_KEY = 'patasnet_whatsapp_config_v1';
const WA_LOGS_STORAGE_KEY = 'patasnet_whatsapp_logs_v1';

export interface WhatsAppLogEntry {
  id: string;
  time: string;
  phone: string;
  type: 'admin_notif' | 'customer_welcome' | 'test' | 'reminder';
  provider: string;
  status: 'sent' | 'fallback_link' | 'failed';
  message: string;
  detail?: string;
}

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppApiConfig = {
  enabled: true,
  provider: 'fonnte',
  apiKey: '',
  apiUrl: 'https://api.fonnte.com/send',
  instanceId: '',
  adminWhatsappNumber: '628993299977',
  sendToAdminOnNewCustomer: true,
  sendToCustomerOnNewCustomer: true,
  autoOpenWaRedirectOnRegister: false,
  adminNewCustomerTemplate: `🔔 *PENDAFTARAN PELANGGAN BARU - {{company_name}}* 🔔

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

Segera hubungi pelanggan untuk survei & jadwal instalasi.`,
  customerWelcomeTemplate: `Halo Kak *{{customer_name}}*! 👋

Terima kasih telah mendaftar layanan internet fiber optik *{{company_name}}*.

📋 *Detail Pendaftaran Anda:*
• *ID Pelanggan:* {{customer_id}}
• *Paket:* {{package_name}} ({{package_speed}})
• *Tagihan Pertama:* {{package_price}}
• *Alamat Instalasi:* {{customer_address}}
• *Titik Lokasi Maps:* {{maps_link}}

Tim teknisi kami akan segera menghubungi nomor WhatsApp ini untuk konfirmasi jadwal pemasangan di lokasi Anda.

Terima kasih telah memilih *{{company_name}}*! 🙏`,
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

export function getWhatsAppConfig(companySettings?: CompanySettings): WhatsAppApiConfig {
  try {
    if (companySettings?.whatsappConfigJson) {
      const parsed = JSON.parse(companySettings.whatsappConfigJson);
      if (parsed && typeof parsed === 'object') {
        const merged: WhatsAppApiConfig = {
          ...DEFAULT_WHATSAPP_CONFIG,
          ...parsed,
          adminWhatsappNumber: formatWhatsAppNumber(
            parsed.adminWhatsappNumber || companySettings.whatsappNumber || DEFAULT_WHATSAPP_CONFIG.adminWhatsappNumber
          ),
        };
        localStorage.setItem(WA_CONFIG_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }

    const saved = localStorage.getItem(WA_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_WHATSAPP_CONFIG,
        ...parsed,
        adminWhatsappNumber: formatWhatsAppNumber(
          parsed.adminWhatsappNumber || companySettings?.whatsappNumber || DEFAULT_WHATSAPP_CONFIG.adminWhatsappNumber
        ),
      };
    }
  } catch (e) {
    console.warn('Failed to parse WhatsApp config:', e);
  }

  return {
    ...DEFAULT_WHATSAPP_CONFIG,
    adminWhatsappNumber: formatWhatsAppNumber(
      companySettings?.whatsappNumber || DEFAULT_WHATSAPP_CONFIG.adminWhatsappNumber
    ),
  };
}

export function saveWhatsAppConfig(config: WhatsAppApiConfig): WhatsAppApiConfig {
  const normalized: WhatsAppApiConfig = {
    ...DEFAULT_WHATSAPP_CONFIG,
    ...config,
    adminWhatsappNumber: formatWhatsAppNumber(
      config.adminWhatsappNumber || DEFAULT_WHATSAPP_CONFIG.adminWhatsappNumber
    ),
  };
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
    const updated = [full, ...existing].slice(0, 40);
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

  return template
    .replace(/\{\{customer_name\}\}/g, variables.customer_name || '-')
    .replace(/\{\{customer_id\}\}/g, variables.customer_id || '-')
    .replace(/\{\{customer_phone\}\}/g, variables.customer_phone || '-')
    .replace(/\{\{customer_email\}\}/g, variables.customer_email || '-')
    .replace(/\{\{customer_address\}\}/g, variables.customer_address || '-')
    .replace(/\{\{package_name\}\}/g, variables.package_name || '-')
    .replace(/\{\{package_speed\}\}/g, variables.package_speed || '-')
    .replace(/\{\{package_price\}\}/g, variables.package_price || '-')
    .replace(/\{\{maps_link\}\}/g, variables.maps_link || '-')
    .replace(/\{\{company_name\}\}/g, variables.company_name || 'Patas Net')
    .replace(/\{\{date\}\}/g, dateStr);
}

export function generateNewCustomerWhatsAppUrl(
  customer: CustomerUser,
  pkg?: WifiPackage,
  companySettings?: CompanySettings
): { adminWaUrl: string; customerWaUrl: string; adminMessage: string; customerMessage: string } {
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

  const adminMessage = formatWhatsAppTemplate(config.adminNewCustomerTemplate, vars);
  const customerMessage = formatWhatsAppTemplate(config.customerWelcomeTemplate, vars);

  const adminPhone = formatWhatsAppNumber(
    config.adminWhatsappNumber || companySettings?.whatsappNumber || '628993299977'
  );
  const customerPhone = formatWhatsAppNumber(customer.phone || '');

  return {
    adminWaUrl: `https://wa.me/${adminPhone}?text=${encodeURIComponent(adminMessage)}`,
    customerWaUrl: customerPhone ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(customerMessage)}` : '',
    adminMessage,
    customerMessage,
  };
}

export async function sendWhatsAppMessageViaApi(
  targetPhone: string,
  message: string,
  config: WhatsAppApiConfig,
  logType: 'admin_notif' | 'customer_welcome' | 'test' | 'reminder' = 'admin_notif'
): Promise<{ ok: boolean; status: 'sent' | 'fallback_link' | 'failed'; detail: string }> {
  const cleanTarget = formatWhatsAppNumber(targetPhone);
  if (!cleanTarget) {
    return { ok: false, status: 'failed', detail: 'Nomor WhatsApp tujuan kosong atau tidak valid.' };
  }

  const token = (config.apiKey || '').trim();

  if (!token) {
    addLocalWhatsAppLog({
      phone: cleanTarget,
      type: logType,
      provider: `${config.provider.toUpperCase()} (Direct Link)`,
      status: 'fallback_link',
      message,
      detail: 'Siap dikirim via tautan WhatsApp langsung (wa.me)',
    });
    return {
      ok: true,
      status: 'fallback_link',
      detail: 'Tautan WhatsApp langsung siap digunakan (Token API Gateway belum diisi).',
    };
  }

  // 1. Direct browser call to Gateway API (works on Vercel static hosting & local)
  try {
    if (config.provider === 'fonnte') {
      const formData = new FormData();
      formData.append('target', cleanTarget);
      formData.append('message', message);
      formData.append('countryCode', '62');

      const res = await fetch(config.apiUrl || 'https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status !== false) {
        addLocalWhatsAppLog({
          phone: cleanTarget,
          type: logType,
          provider: 'Fonnte API',
          status: 'sent',
          message,
          detail: data.detail || 'Terkirim otomatis via Fonnte WhatsApp Gateway',
        });
        return { ok: true, status: 'sent', detail: data.detail || 'Berhasil dikirim otomatis via Fonnte API!' };
      } else {
        throw new Error(data.reason || data.detail || `Fonnte HTTP ${res.status}`);
      }
    }

    if (config.provider === 'ultramsg') {
      const instance = (config.instanceId || '').trim();
      const endpoint =
        config.apiUrl && config.apiUrl.includes('ultramsg.com')
          ? config.apiUrl
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
        addLocalWhatsAppLog({
          phone: cleanTarget,
          type: logType,
          provider: 'UltraMsg API',
          status: 'sent',
          message,
          detail: 'Terkirim otomatis via UltraMsg Gateway',
        });
        return { ok: true, status: 'sent', detail: 'Berhasil dikirim otomatis via UltraMsg API!' };
      } else {
        throw new Error(data.error || `UltraMsg HTTP ${res.status}`);
      }
    }

    if (config.provider === 'wablas') {
      const endpoint = config.apiUrl || 'https://pati.wablas.com/api/send-message';
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
        addLocalWhatsAppLog({
          phone: cleanTarget,
          type: logType,
          provider: 'Wablas API',
          status: 'sent',
          message,
          detail: 'Terkirim otomatis via Wablas Gateway',
        });
        return { ok: true, status: 'sent', detail: 'Berhasil dikirim otomatis via Wablas API!' };
      } else {
        throw new Error(data.message || `Wablas HTTP ${res.status}`);
      }
    }

    if (config.provider === 'custom') {
      if (!config.apiUrl) throw new Error('URL Endpoint Custom API belum diisi.');
      const res = await fetch(config.apiUrl, {
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
        addLocalWhatsAppLog({
          phone: cleanTarget,
          type: logType,
          provider: 'Custom Webhook API',
          status: 'sent',
          message,
          detail: 'Terkirim otomatis via Custom Webhook',
        });
        return { ok: true, status: 'sent', detail: 'Berhasil dikirim otomatis via Custom Webhook API!' };
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
          target: cleanTarget,
          message,
          config,
        }),
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.ok) {
          addLocalWhatsAppLog({
            phone: cleanTarget,
            type: logType,
            provider: `${config.provider.toUpperCase()} (Server Proxy)`,
            status: 'sent',
            message,
            detail: proxyData.detail || 'Terkirim via Server Proxy',
          });
          return { ok: true, status: 'sent', detail: proxyData.detail || 'Berhasil dikirim via Server Proxy!' };
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
    return { ok: false, status: 'failed', detail: errMsg };
  }

  return { ok: false, status: 'failed', detail: 'Provider tidak dikenali.' };
}

export async function notifyNewCustomerViaWhatsApp(
  customer: CustomerUser,
  pkg?: WifiPackage,
  companySettings?: CompanySettings
): Promise<{
  adminWaUrl: string;
  customerWaUrl: string;
  apiSentToAdmin: boolean;
  apiSentToCustomer: boolean;
  statusDetail: string;
}> {
  const config = getWhatsAppConfig(companySettings);
  const { adminWaUrl, customerWaUrl, adminMessage, customerMessage } = generateNewCustomerWhatsAppUrl(
    customer,
    pkg,
    companySettings
  );

  let apiSentToAdmin = false;
  let apiSentToCustomer = false;
  const details: string[] = [];

  if (config.enabled) {
    if (config.sendToAdminOnNewCustomer && config.adminWhatsappNumber) {
      const adminRes = await sendWhatsAppMessageViaApi(
        config.adminWhatsappNumber,
        adminMessage,
        config,
        'admin_notif'
      );
      apiSentToAdmin = adminRes.status === 'sent';
      details.push(`Admin: ${adminRes.detail}`);
    }

    if (config.sendToCustomerOnNewCustomer && customer.phone) {
      const custRes = await sendWhatsAppMessageViaApi(
        customer.phone,
        customerMessage,
        config,
        'customer_welcome'
      );
      apiSentToCustomer = custRes.status === 'sent';
      details.push(`Pelanggan: ${custRes.detail}`);
    }
  }

  return {
    adminWaUrl,
    customerWaUrl,
    apiSentToAdmin,
    apiSentToCustomer,
    statusDetail: details.join(' | ') || 'Siap dikirim via WhatsApp',
  };
}
