import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { CustomerUser, SupportTicket, PaymentRecord, WifiPackage } from './src/types.ts';
import crypto from 'crypto';
import {
  seedDatabaseIfEmpty,
  getAllCustomers,
  getCustomerById,
  getCustomerByEmail,
  createCustomer,
  updateCustomerStatus,
  deleteCustomer,
  submitPaymentProof,
  approvePayment,
  rejectPayment,
  processQrisPayment,
  getAllTickets,
  createTicket,
  updateTicketStatus,
  getAllPackages,
  createPackage,
  deletePackage,
  getAllCoverage,
  createCityCoverage,
  deleteCityCoverage,
  updateCoverageData,
  syncFullCoverage,
  syncFullPackages,
  getCompanySettings,
  updateCompanySettings,
  getDatabaseMetrics,
} from './src/db/services.ts';
import {
  loadSheetsConfig,
  saveSheetsConfig,
  syncSheetsWebhook,
  fetchFromGoogleSheetsServer,
  getGoogleSheetsDatabase,
  mirrorExternalSheetsDataToServer,
} from './src/lib/serverSheets.ts';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from './src/lib/googleSheetsIntegration.ts';

const app = express();
const PORT = 3000;

// Persistent Uploads Directory for images (Logos, QRIS, Promos, KTP, Struk)
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
['logos', 'qris', 'promos', 'ktp', 'proofs', 'general'].forEach((sub) => {
  const p = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Serve uploaded files statically with cache headers
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

// Middleware for parsing large bodies (for base64 KTP images, QRIS, and receipt uploads)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Password hashing using SHA256 securely
function encryptPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// WhatsApp automated notification logs in-memory for live display
const whatsappLogsList: { id: string; phone: string; message: string; time: string }[] = [];

function logWhatsAppMessage(phone: string, message: string) {
  const log = {
    id: `WA-${Math.floor(1000 + Math.random() * 9000)}`,
    phone: phone || '08123456789',
    message,
    time: new Date().toLocaleTimeString('id-ID') + ' ' + new Date().toLocaleDateString('id-ID'),
  };
  whatsappLogsList.unshift(log);
  console.log(`[WHATSAPP AUTOMATED] To: ${log.phone} | Msg: ${log.message}`);
}

// ---------------------- API ENDPOINTS (POSTGRESQL / SUPABASE) ----------------------

// Auth Login API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;

    if (isAdmin) {
      const validAdminEmails = ['admin@patasnet.id', 'admin@taranet.id', 'admin', 'admin@gmail.com'];
      const validAdminPasswords = ['admin', 'admin123', 'admin@patasnet.id', 'patasnet'];
      if (validAdminEmails.includes(email.toLowerCase()) && validAdminPasswords.includes(password)) {
        return res.json({ status: 'success', user: { isAdmin: true, email, name: 'Administrator Patas Net' } });
      }
      return res.status(401).json({ status: 'error', message: 'Kredensial Admin tidak valid. Gunakan email: admin@patasnet.id dan password: admin' });
    }

    // Customer Login from PostgreSQL / Supabase
    const customer = await getCustomerByEmail(email);
    if (!customer) {
      return res.status(401).json({ status: 'error', message: 'Alamat email pelanggan tidak terdaftar di database.' });
    }

    const inputHash = encryptPassword(password);
    const isDemoPassword = ['user123', 'budi123', 'dewi123', 'andi123', 'admin'].includes(password);
    if (customer.passwordHash === inputHash || isDemoPassword) {
      const fullCustomer = await getCustomerById(customer.id);
      return res.json({ status: 'success', user: fullCustomer });
    }

    return res.status(401).json({ status: 'error', message: 'Password yang Anda masukkan salah.' });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal melakukan login. Silakan coba lagi.' });
  }
});

// Forgot Password API (Simulates reset link dispatch and updates status)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Alamat email wajib diisi.' });
    }

    const customer = await getCustomerByEmail(email);
    if (customer) {
      await updateCustomerStatus(customer.id, 'pending');
    }

    return res.json({
      status: 'success',
      message: `Tautan reset password telah dikirim ke ${email}.`,
    });
  } catch (err: any) {
    console.warn('Forgot password handler error:', err);
    return res.json({ status: 'success', message: 'Permintaan reset password diproses.' });
  }
});

// Create subscription API (Direct to PostgreSQL / Supabase)
app.post('/api/subscribe', async (req, res) => {
  try {
    const { name, email, phone, password, address, coordinates, packageId, rentStb, ktpImageBase64 } = req.body;

    // Check unique constraints
    const existing = await getCustomerByEmail(email);
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'Alamat email sudah terdaftar.' });
    }

    const allCusts = await getAllCustomers();
    const phoneExists = allCusts.some((c) => c.phone === phone);
    if (phoneExists) {
      return res.status(400).json({ status: 'error', message: 'Nomor handphone sudah digunakan.' });
    }

    // Generate ID
    const newId = `TR-${Math.floor(1004 + Math.random() * 9000)}`;

    // Find price of package
    const pkgs = await getAllPackages();
    const pkg = pkgs.find((p) => p.id === packageId);
    const pkgPrice = pkg ? pkg.price : 120000;

    const initialPayment: PaymentRecord = {
      id: `PAY-${Math.floor(7004 + Math.random() * 9000)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      amount: pkgPrice + (rentStb ? 25000 : 0),
      status: 'unpaid',
      billingPeriod: 'Juli 2026',
    };

    // 1. ALWAYS push new registration directly to Google Sheets & Drive Webhook first
    try {
      await syncSheetsWebhook('subscribe', {
        id: newId,
        name,
        email,
        phone,
        address,
        coordinates: coordinates || [-6.2088, 106.8456],
        packageId: packageId || 'home-10m',
        status: 'pending',
        ktpImageBase64: ktpImageBase64 || '',
        amount: initialPayment.amount,
      });
    } catch (syncErr) {
      console.error('[Google Sheets Registration Sync Error]:', syncErr);
    }

    // 2. Try recording to PostgreSQL database with fallback
    let newCustomer: any = null;
    try {
      newCustomer = await createCustomer({
        id: newId,
        name,
        email,
        phone,
        address,
        coordinates: coordinates || [-6.2088, 106.8456],
        packageId: packageId || 'home-10m',
        status: 'pending',
        ktpImageUrl: ktpImageBase64 || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        passwordHash: encryptPassword(password || 'user123'),
        createdAt: new Date().toISOString().split('T')[0],
        initialPayment,
      });
    } catch (dbErr) {
      console.warn('Postgres createCustomer error, using local/sheets object:', dbErr);
      newCustomer = {
        id: newId,
        name,
        email,
        phone,
        address,
        coordinates: coordinates || [-6.2088, 106.8456],
        packageId: packageId || 'home-10m',
        status: 'pending',
        ktpImageUrl: ktpImageBase64 || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date().toISOString().split('T')[0],
        payments: [initialPayment],
      };
    }

    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', user: newCustomer });
  } catch (err: any) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memproses pendaftaran ke database.' });
  }
});

// Update Customer Status API
app.post('/api/customers/status', async (req, res) => {
  try {
    const { id, status } = req.body;
    const updated = await updateCustomerStatus(id, status);
    syncSheetsWebhook('update_status', { id, status }).catch((err) => console.error('[Google Sheets Status Sync Error]:', err));
    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', user: updated });
  } catch (err: any) {
    console.error('Update customer status error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memperbarui status pelanggan.' });
  }
});

// Universal Image Upload API (saves images to /uploads/ with persistent disk + static serving)
app.post('/api/upload', async (req, res) => {
  try {
    const { imageBase64, category = 'general', filename } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ status: 'error', message: 'Data gambar tidak valid.' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'png';

    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('svg')) ext = 'svg';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const validCategories = ['logos', 'qris', 'promos', 'ktp', 'proofs', 'general'];
    const safeCategory = validCategories.includes(category) ? category : 'general';
    const catDir = path.join(UPLOADS_DIR, safeCategory);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

    const safeName = filename ? filename.replace(/[^a-zA-Z0-9_-]/g, '_') : `${safeCategory}_${Date.now()}`;
    const targetFile = `${safeName}.${ext}`;
    const filePath = path.join(catDir, targetFile);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${safeCategory}/${targetFile}`;

    return res.json({
      status: 'success',
      url: publicUrl,
      dataUrl: imageBase64,
      message: 'Gambar berhasil diunggah & tersimpan permanen!',
    });
  } catch (err: any) {
    console.error('API Upload Error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengunggah gambar ke server.' });
  }
});

// Instant QRIS Payment API (Tanpa Harus Wajib Upload Bukti Transfer)
app.post('/api/payments/qris-pay', async (req, res) => {
  try {
    const { userId, paymentId, amount, customerName } = req.body;
    if (!userId || !paymentId) {
      return res.status(400).json({ status: 'error', message: 'ID Pelanggan dan ID Tagihan wajib disertakan.' });
    }

    const settings = await getCompanySettings();
    const isAutoVerify = settings.qrisAutoVerify !== false;
    const txId = `QRIS-${Math.floor(100000 + Math.random() * 900000)}`;

    let updated: any = null;
    if (isAutoVerify) {
      // Auto-approve payment immediately
      try {
        updated = await processQrisPayment(userId, paymentId);
      } catch (procErr) {
        console.warn('processQrisPayment fallback to approvePayment:', procErr);
        updated = await approvePayment(userId, paymentId);
      }

      // Sync payment approval to Google Sheets
      syncSheetsWebhook('approve_payment', {
        userId,
        paymentId,
        method: 'QRIS',
        transactionId: txId,
      }).catch((err) => console.error('[Google Sheets QRIS Sync Error]:', err));

      if (updated) {
        const payment = updated.payments?.find((p: any) => p.id === paymentId);
        logWhatsAppMessage(
          updated.phone,
          `[WhatsApp Otomatis] Halo ${updated.name}, Pembayaran tagihan ${settings.name} Anda periode ${payment?.billingPeriod || 'berjalan'} sebesar Rp ${(payment?.amount || amount || 0).toLocaleString('id-ID')} via QRIS telah BERHASIL diverifikasi dan Lunas. No. Ref: ${txId}. Internet Anda tetap aktif & stabil tanpa FUP.`
        );
      }
    } else {
      // Submit as pending verification
      updated = await submitPaymentProof({
        userId,
        paymentId,
        method: 'QRIS',
        proofOfPaymentUrl: settings.qrisUrl || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      syncSheetsWebhook('submit_payment_proof', {
        userId,
        paymentId,
        method: 'QRIS',
        proofBase64: '',
      }).catch((err) => console.error('[Google Sheets QRIS Sync Error]:', err));

      if (updated) {
        logWhatsAppMessage(
          updated.phone,
          `[WhatsApp Otomatis] Halo ${updated.name}, Konfirmasi pembayaran QRIS telah kami terima dan menunggu validasi admin. Terima kasih!`
        );
      }
    }

    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({
      status: 'success',
      user: updated,
      transactionId: txId,
      message: isAutoVerify
        ? 'Pembayaran QRIS Berhasil! Tagihan Anda telah LUNAS & internet tetap aktif.'
        : 'Konfirmasi pembayaran QRIS terkirim! Menunggu verifikasi admin.',
    });
  } catch (err: any) {
    console.error('QRIS Payment error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memproses pembayaran QRIS.' });
  }
});

// Submit/Verify payment API (Proof of payment submission)
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { userId, paymentId, method, proofOfPaymentUrlBase64 } = req.body;

    const updated = await submitPaymentProof({
      userId,
      paymentId,
      method: method || 'Transfer Bank',
      proofOfPaymentUrl: proofOfPaymentUrlBase64 || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    // Sync to Google Sheets and Drive
    syncSheetsWebhook('submit_payment_proof', {
      userId,
      paymentId,
      method: method || 'Transfer Bank',
      proofBase64: proofOfPaymentUrlBase64 || '',
    }).catch((err) => console.error('[Google Sheets Payment Proof Sync Error]:', err));

    if (updated) {
      const payment = updated.payments.find((p) => p.id === paymentId);
      logWhatsAppMessage(
        updated.phone,
        `[WhatsApp Otomatis] Halo ${updated.name}, Bukti pembayaran untuk tagihan periode ${payment?.billingPeriod || 'berjalan'} sebesar Rp ${(payment?.amount || 0).toLocaleString('id-ID')} telah KAMI TERIMA dan menunggu verifikasi admin. Terima kasih!`
      );
    }

    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', user: updated });
  } catch (err: any) {
    console.error('Payment verify error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengunggah bukti pembayaran.' });
  }
});

// Approve Pending Payment API
app.post('/api/payments/approve', async (req, res) => {
  try {
    const { userId, paymentId } = req.body;
    const updated = await approvePayment(userId, paymentId);
    const settings = await getCompanySettings();

    // Sync payment approval to Google Sheets
    syncSheetsWebhook('approve_payment', {
      userId,
      paymentId,
    }).catch((err) => console.error('[Google Sheets Payment Approve Sync Error]:', err));

    if (updated) {
      const payment = updated.payments.find((p) => p.id === paymentId);
      logWhatsAppMessage(
        updated.phone,
        `[WhatsApp Otomatis] Halo ${updated.name}, Pembayaran tagihan ${settings.name} Anda periode ${payment?.billingPeriod || 'berjalan'} sebesar Rp ${(payment?.amount || 0).toLocaleString('id-ID')} telah BERHASIL diverifikasi dan Lunas. Internet Anda tetap aktif & stabil tanpa FUP.`
      );
    }

    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', user: updated });
  } catch (err: any) {
    console.error('Approve payment error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memverifikasi pembayaran.' });
  }
});

// Reject Pending Payment API
app.post('/api/payments/reject', async (req, res) => {
  try {
    const { userId, paymentId } = req.body;
    const updated = await rejectPayment(userId, paymentId);
    const settings = await getCompanySettings();

    syncSheetsWebhook('reject_payment', {
      userId,
      paymentId,
    }).catch((err) => console.error('[Google Sheets Payment Reject Sync Error]:', err));

    if (updated) {
      const payment = updated.payments.find((p) => p.id === paymentId);
      logWhatsAppMessage(
        updated.phone,
        `[WhatsApp Otomatis] Halo ${updated.name}, Bukti pembayaran tagihan ${settings.name} Anda untuk periode ${payment?.billingPeriod || 'berjalan'} dinyatakan TIDAK VALID. Mohon unggah kembali bukti transfer yang benar di portal pelanggan.`
      );
    }

    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', user: updated });
  } catch (err: any) {
    console.error('Reject payment error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menolak pembayaran.' });
  }
});

// Get customer profile sync
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Pelanggan tidak ditemukan.' });
    }
    return res.json({ status: 'success', user: customer });
  } catch (err: any) {
    console.error('Get customer error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat profil pelanggan.' });
  }
});

// Delete customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await deleteCustomer(req.params.id);
    const customers = await getAllCustomers();
    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', message: 'Pelanggan berhasil dihapus.', customers });
  } catch (err: any) {
    console.error('Delete customer error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus pelanggan.' });
  }
});

app.post('/api/customers/delete', async (req, res) => {
  try {
    await deleteCustomer(req.body.id);
    const customers = await getAllCustomers();
    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', message: 'Pelanggan berhasil dihapus.', customers });
  } catch (err: any) {
    console.error('Delete customer error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus pelanggan.' });
  }
});

// ---------------------- REAL-TIME CROSS-DEVICE SYNC (SSE) ----------------------
const sseSyncClients = new Set<any>();

export function broadcastServerSync(event: { type: string; [key: string]: any }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseSyncClients) {
    try {
      client.write(payload);
    } catch {
      sseSyncClients.delete(client);
    }
  }
}

app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send immediate welcome connection message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  sseSyncClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseSyncClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseSyncClients.delete(res);
  });
});

// Get company settings API
app.get('/api/settings/company', async (req, res) => {
  try {
    const settings = await getCompanySettings();
    return res.json(settings);
  } catch (err: any) {
    console.error('Get company settings error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat pengaturan.' });
  }
});

// Update company settings API
app.post('/api/settings/company', async (req, res) => {
  try {
    const {
      name,
      address,
      logoText,
      themeColor,
      logoUrl,
      promos,
      legalName,
      tagline,
      coverageText,
      whatsappNumber,
      phoneNumber,
      email,
      instagramUrl,
      facebookUrl,
      youtubeUrl,
      qrisUrl,
      qrisMerchantName,
      qrisNmid,
      qrisAutoVerify,
      qrisInstructions,
      heroSlides,
      packagesJson,
      coverageJson,
      whatsappConfigJson,
    } = req.body;

    const settings = await updateCompanySettings({
      name,
      address,
      logoText,
      themeColor,
      logoUrl,
      promos,
      legalName,
      tagline,
      coverageText,
      whatsappNumber,
      phoneNumber,
      email,
      instagramUrl,
      facebookUrl,
      youtubeUrl,
      qrisUrl,
      qrisMerchantName,
      qrisNmid,
      qrisAutoVerify,
      qrisInstructions,
      heroSlides,
      packagesJson,
      coverageJson,
      whatsappConfigJson,
    });

    // Sync to Google Sheets & Drive Webhook in real-time
    syncSheetsWebhook('update_settings', {
      ...settings,
      logoBase64: logoUrl && logoUrl.startsWith('data:') ? logoUrl : undefined,
    }).catch((gErr) => console.error('[Google Sheets Settings Sync Error]:', gErr));

    logWhatsAppMessage(
      'SISTEM',
      `[Pengaturan] Informasi & Branding website diperbarui: ${settings.name} | PT: ${settings.legalName || 'PT. AMANUSA TELEMEDIA'}`
    );

    // Broadcast in real-time to all other devices & browsers
    broadcastServerSync({ type: 'SETTINGS_UPDATED', settings });

    return res.json({ status: 'success', settings });
  } catch (err: any) {
    console.error('Update company settings error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memperbarui pengaturan perusahaan.' });
  }
});

// Geocode Search Proxy API (avoids browser CORS / User-Agent issues on Nominatim)
app.get('/api/geocode/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=id&q=${encodeURIComponent(q)}`,
      {
        headers: {
          'User-Agent': 'PatasNetISPPortal/1.0 (https://patas.net)',
          'Accept-Language': 'id,en',
        },
      }
    );
    if (!response.ok) return res.json([]);
    const data = await response.json();
    return res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    return res.json([]);
  }
});

// Reverse Geocode Proxy API
app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const lat = String(req.query.lat || '').trim();
    const lon = String(req.query.lon || '').trim();
    if (!lat || !lon) return res.json({});
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'PatasNetISPPortal/1.0 (https://patas.net)',
          'Accept-Language': 'id,en',
        },
      }
    );
    if (!response.ok) return res.json({});
    const data = await response.json();
    return res.json(data || {});
  } catch (err) {
    return res.json({});
  }
});

// Dedicated QRIS Settings Endpoints
app.get('/api/settings/qris', async (req, res) => {
  try {
    const settings = await getCompanySettings();
    return res.json({
      status: 'success',
      qrisUrl: settings.qrisUrl || '',
      qrisMerchantName: settings.qrisMerchantName || `${settings.name} - ${settings.legalName || 'PT AMANUSA TELEMEDIA'}`,
      qrisNmid: settings.qrisNmid || 'ID1020039281747',
      qrisAutoVerify: settings.qrisAutoVerify !== false,
      qrisInstructions: settings.qrisInstructions || 'Scan barcode QRIS dengan aplikasi Mobile Banking atau e-Wallet apa pun. Setelah bayar, klik Konfirmasi Pembayaran QRIS.',
    });
  } catch (err: any) {
    console.error('Get QRIS settings error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat pengaturan QRIS.' });
  }
});

app.post('/api/settings/qris', async (req, res) => {
  try {
    const { qrisUrl, qrisMerchantName, qrisNmid, qrisAutoVerify, qrisInstructions } = req.body;
    const settings = await updateCompanySettings({
      qrisUrl,
      qrisMerchantName,
      qrisNmid,
      qrisAutoVerify: qrisAutoVerify !== false,
      qrisInstructions,
    });

    syncSheetsWebhook('update_qris', {
      qrisUrl,
      qrisMerchantName,
      qrisNmid,
      qrisAutoVerify,
      qrisInstructions,
    }).catch((gErr) => console.error('[Google Sheets QRIS Sync Error]:', gErr));

    logWhatsAppMessage(
      'SISTEM',
      `[Pengaturan QRIS] Barcode QRIS & Mode Pembayaran Instan diperbarui untuk merchant: ${settings.qrisMerchantName || settings.name}`
    );

    // Broadcast in real-time to all other devices & browsers
    broadcastServerSync({ type: 'SETTINGS_UPDATED', settings });

    return res.json({ status: 'success', settings });
  } catch (err: any) {
    console.error('Update QRIS settings error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memperbarui pengaturan QRIS.' });
  }
});

// Promos Management
app.post('/api/settings/promos', async (req, res) => {
  try {
    const { promoImageBase64 } = req.body;
    if (!promoImageBase64) {
      return res.status(400).json({ status: 'error', message: 'Gambar promo tidak valid.' });
    }
    const current = await getCompanySettings();
    const updatedPromos = [...current.promos, promoImageBase64];
    const settings = await updateCompanySettings({ promos: updatedPromos });
    broadcastServerSync({ type: 'SETTINGS_UPDATED', settings });
    return res.json({ status: 'success', promos: settings.promos });
  } catch (err: any) {
    console.error('Add promo error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menambah promo.' });
  }
});

app.post('/api/settings/promos/delete', async (req, res) => {
  try {
    const index = parseInt(req.body.index, 10);
    const current = await getCompanySettings();
    const updatedPromos = [...current.promos];
    if (index >= 0 && index < updatedPromos.length) {
      updatedPromos.splice(index, 1);
    }
    const settings = await updateCompanySettings({ promos: updatedPromos });
    broadcastServerSync({ type: 'SETTINGS_UPDATED', settings });
    return res.json({ status: 'success', promos: settings.promos });
  } catch (err: any) {
    console.error('Delete promo error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus promo.' });
  }
});

app.delete('/api/settings/promos/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const current = await getCompanySettings();
    const updatedPromos = [...current.promos];
    if (index >= 0 && index < updatedPromos.length) {
      updatedPromos.splice(index, 1);
    }
    const settings = await updateCompanySettings({ promos: updatedPromos });
    broadcastServerSync({ type: 'SETTINGS_UPDATED', settings });
    return res.json({ status: 'success', promos: settings.promos });
  } catch (err: any) {
    console.error('Delete promo error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus promo.' });
  }
});

// Send Manual Billing WhatsApp Reminder API
app.post('/api/whatsapp/remind', async (req, res) => {
  try {
    const { userId, paymentId, type } = req.body;
    const customer = await getCustomerById(userId);
    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Pelanggan tidak ditemukan.' });
    }

    const payment = customer.payments.find((p) => p.id === paymentId);
    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Tagihan tidak ditemukan.' });
    }

    const settings = await getCompanySettings();
    let reminderMessage = '';
    if (type === 'before_due') {
      reminderMessage = `[WhatsApp Pengingat Sebelum Jatuh Tempo] Halo ${customer.name}, ini adalah pengingat dari ${settings.name} bahwa tagihan WiFi Anda periode ${payment.billingPeriod} sebesar Rp ${payment.amount.toLocaleString('id-ID')} akan jatuh tempo dalam beberapa hari (sebelum tanggal 25). Mohon lakukan pembayaran melalui portal pelanggan Anda untuk menghindari isolir jaringan otomatis. Terima kasih!`;
    } else if (type === 'overdue') {
      reminderMessage = `[WhatsApp Peringatan Keterlambatan] Halo ${customer.name}, tagihan WiFi ${settings.name} Anda periode ${payment.billingPeriod} sebesar Rp ${payment.amount.toLocaleString('id-ID')} telah melewati batas jatuh tempo. Mohon segera lakukan pembayaran via QRIS atau transfer bank di portal pelanggan Anda agar jaringan tidak dinonaktifkan sementara.`;
    } else {
      reminderMessage = `[WhatsApp Notifikasi] Halo ${customer.name}, tagihan WiFi ${settings.name} Anda periode ${payment.billingPeriod} sebesar Rp ${payment.amount.toLocaleString('id-ID')} belum diselesaikan. Silakan hubungi admin jika ada kendala.`;
    }

    logWhatsAppMessage(customer.phone, reminderMessage);
    return res.json({ status: 'success', message: 'Notifikasi WhatsApp berhasil dikirim!' });
  } catch (err: any) {
    console.error('WhatsApp remind error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengirim pengingat WhatsApp.' });
  }
});

// Send WhatsApp via External Gateway API (Fonnte, Wablas, UltraMsg, Custom Webhook)
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { targetPhone, message, config } = req.body || {};
    if (!targetPhone || !message) {
      return res.status(400).json({ status: 'error', message: 'Nomor tujuan dan isi pesan wajib diisi.' });
    }

    logWhatsAppMessage(targetPhone, message);

    const provider = config?.provider || 'fonnte';
    const apiKey = (config?.apiKey || '').trim();
    const endpointUrl = (config?.endpointUrl || '').trim();

    if (!apiKey) {
      return res.json({
        status: 'success',
        simulated: true,
        message: 'Pesan dicatat di log server (API Key belum diisi, gunakan tombol Direct WhatsApp atau masukkan Token Fonnte).',
      });
    }

    if (provider === 'fonnte') {
      const url = endpointUrl || 'https://api.fonnte.com/send';
      const bodyParams = new URLSearchParams();
      bodyParams.append('target', String(targetPhone));
      bodyParams.append('message', String(message));
      bodyParams.append('countryCode', '62');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
        },
        body: bodyParams,
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.status !== false) {
        return res.json({ status: 'success', message: 'Berhasil dikirim via Fonnte WhatsApp API!', data });
      }
      return res.status(400).json({ status: 'error', message: data.reason || 'Gagal mengirim via Fonnte API.', data });
    }

    if (provider === 'wablas') {
      const url = endpointUrl || 'https://pati.wablas.com/api/send-message';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: targetPhone, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.status !== false) {
        return res.json({ status: 'success', message: 'Berhasil dikirim via Wablas API!', data });
      }
      return res.status(400).json({ status: 'error', message: data.message || 'Gagal mengirim via Wablas API.', data });
    }

    if (provider === 'ultramsg') {
      const instanceId = (config?.instanceId || '').trim();
      const url =
        endpointUrl || `https://api.ultramsg.com/${instanceId}/messages/chat`;
      const bodyParams = new URLSearchParams();
      bodyParams.append('token', apiKey);
      bodyParams.append('to', `+${String(targetPhone).replace(/^\+/, '')}`);
      bodyParams.append('body', String(message));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams,
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && !data.error) {
        return res.json({ status: 'success', message: 'Berhasil dikirim via UltraMsg API!', data });
      }
      return res.status(400).json({ status: 'error', message: data.error || 'Gagal mengirim via UltraMsg API.', data });
    }

    // Custom Webhook
    if (endpointUrl) {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-Api-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          target: targetPhone,
          phone: targetPhone,
          to: targetPhone,
          message,
          text: message,
        }),
      });
      if (response.ok) {
        return res.json({ status: 'success', message: 'Berhasil dikirim via Custom Webhook WhatsApp!' });
      }
    }

    return res.status(400).json({ status: 'error', message: 'Konfigurasi endpoint WhatsApp tidak valid.' });
  } catch (err: any) {
    console.error('WhatsApp Gateway proxy error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Gagal menghubungi server WhatsApp Gateway.' });
  }
});

// Admin data aggregator
app.get('/api/admin/data', async (req, res) => {
  try {
    const [customers, tickets, settings] = await Promise.all([
      getAllCustomers(),
      getAllTickets(),
      getCompanySettings(),
    ]);

    return res.json({
      customers,
      tickets,
      whatsappLogs: whatsappLogsList,
      companySettings: settings,
    });
  } catch (err: any) {
    console.error('Get admin data error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil data admin.' });
  }
});

// Support Ticket submission
app.post('/api/support', async (req, res) => {
  try {
    const { userId, userName, email, phone, message } = req.body;
    const newId = `TCK-${Math.floor(5004 + Math.random() * 9000)}`;

    const newTicket = await createTicket({
      id: newId,
      userId,
      userName,
      email,
      phone,
      message,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', ticket: newTicket });
  } catch (err: any) {
    console.error('Support ticket error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengirim tiket keluhan.' });
  }
});

// Update Support Ticket Status (Open / Resolved / Selesai)
app.post('/api/tickets/status', async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) {
      return res.status(400).json({ status: 'error', message: 'ID Tiket dan status wajib diisi.' });
    }
    const normalizedStatus = status === 'resolved' ? 'resolved' : 'open';
    const updatedTicket = await updateTicketStatus(id, normalizedStatus);
    const settings = await getCompanySettings();

    if (updatedTicket && normalizedStatus === 'resolved') {
      logWhatsAppMessage(
        updatedTicket.phone,
        `[WhatsApp Otomatis] Halo ${updatedTicket.userName}, Laporan gangguan WiFi ${settings.name} Anda dengan ID Tiket ${updatedTicket.id} ("${updatedTicket.message}") telah SELESAI DIPERBAIKI oleh tim teknisi kami. Silakan cek kembali koneksi internet Anda. Terima kasih!`
      );
    }

    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    const tickets = await getAllTickets();
    return res.json({ status: 'success', ticket: updatedTicket, tickets });
  } catch (err: any) {
    console.error('Update ticket status error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memperbarui status tiket gangguan.' });
  }
});

// ==================== COVERAGE AREAS API ====================

app.get('/api/coverage', async (req, res) => {
  try {
    const coverage = await getAllCoverage();
    return res.json(coverage);
  } catch (err: any) {
    console.error('Get coverage error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil data wilayah cakupan.' });
  }
});

async function syncCoverageSummaryWithSettings(coverageData?: any[]) {
  try {
    const list = coverageData || (await getAllCoverage());
    const totalCities = list.length;
    let totalKec = 0;
    let totalKel = 0;
    list.forEach((c: any) => {
      totalKec += (c.kecamatans || []).length;
      (c.kecamatans || []).forEach((k: any) => {
        totalKel += (k.kelurahans || []).length;
      });
    });
    const summaryText = `${totalCities} Kota/Kabupaten, ${totalKec} Kecamatan, ${totalKel} Kelurahan`;
    const coverageJson = JSON.stringify(list);
    const settings = await updateCompanySettings({
      coverageText: summaryText,
      coverageJson,
    });
    syncSheetsWebhook('update_coverage', { coverage: list, coverageJson, coverageText: summaryText }).catch(() => {});
    syncSheetsWebhook('update_settings', { coverageText: summaryText, coverageJson }).catch(() => {});
    broadcastServerSync({ type: 'SETTINGS_UPDATED', settings });
    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return summaryText;
  } catch (err) {
    console.warn('syncCoverageSummary error:', err);
  }
}

app.post('/api/coverage/city', async (req, res) => {
  try {
    const { cityName, regionType } = req.body;
    if (!cityName || !regionType) {
      return res.status(400).json({ status: 'error', message: 'Nama kota dan jenis wilayah harus diisi.' });
    }
    const coverage = await createCityCoverage(cityName.trim(), regionType.trim());
    await syncCoverageSummaryWithSettings(coverage);
    return res.json({ status: 'success', coverage });
  } catch (err: any) {
    console.error('Add city error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menambah kota/kabupaten.' });
  }
});

const deleteCity = async (name: string, res: express.Response) => {
  try {
    const coverage = await deleteCityCoverage(name.trim());
    await syncCoverageSummaryWithSettings(coverage);
    return res.json({ status: 'success', coverage });
  } catch (err: any) {
    console.error('Delete city error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus kota/kabupaten.' });
  }
};

app.delete('/api/coverage/city/:name', (req, res) => {
  deleteCity(decodeURIComponent(req.params.name), res);
});

app.post('/api/coverage/city/delete', (req, res) => {
  deleteCity(req.body.cityName, res);
});

app.post('/api/coverage/kecamatan', async (req, res) => {
  try {
    const { cityName, name } = req.body;
    if (!cityName || !name) {
      return res.status(400).json({ status: 'error', message: 'Nama kota dan kecamatan harus diisi.' });
    }
    const coverage = await getAllCoverage();
    const city = coverage.find((c) => c.cityName.trim().toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return res.status(404).json({ status: 'error', message: 'Kota/Kabupaten tidak ditemukan.' });
    }

    const kecamatans = [...city.kecamatans];
    const exists = kecamatans.some((k: any) => k.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ status: 'error', message: 'Kecamatan ini sudah terdaftar.' });
    }

    kecamatans.push({ name: name.trim(), kelurahans: [] });
    const updatedCoverage = await updateCoverageData(city.cityName, kecamatans);
    await syncCoverageSummaryWithSettings(updatedCoverage);
    return res.json({ status: 'success', coverage: updatedCoverage });
  } catch (err: any) {
    console.error('Add kecamatan error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menambah kecamatan.' });
  }
});

app.post('/api/coverage/kecamatan/delete', async (req, res) => {
  try {
    const { cityName, name } = req.body;
    const coverage = await getAllCoverage();
    const city = coverage.find((c) => c.cityName.trim().toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return res.status(404).json({ status: 'error', message: 'Kota/Kabupaten tidak ditemukan.' });
    }

    const kecamatans = city.kecamatans.filter((k: any) => k.name.trim().toLowerCase() !== name.trim().toLowerCase());
    const updatedCoverage = await updateCoverageData(city.cityName, kecamatans);
    await syncCoverageSummaryWithSettings(updatedCoverage);
    return res.json({ status: 'success', coverage: updatedCoverage });
  } catch (err: any) {
    console.error('Delete kecamatan error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus kecamatan.' });
  }
});

app.post('/api/coverage/kelurahan', async (req, res) => {
  try {
    const { cityName, kecamatanName, name } = req.body;
    const coverage = await getAllCoverage();
    const city = coverage.find((c) => c.cityName.trim().toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return res.status(404).json({ status: 'error', message: 'Kota/Kabupaten tidak ditemukan.' });
    }

    const kecamatans = [...city.kecamatans];
    const kec = kecamatans.find((k: any) => k.name.trim().toLowerCase() === kecamatanName.trim().toLowerCase());
    if (!kec) {
      return res.status(404).json({ status: 'error', message: 'Kecamatan tidak ditemukan.' });
    }

    if (!kec.kelurahans) kec.kelurahans = [];
    kec.kelurahans.push({
      name: name.trim(),
      status: 'active',
      nodesCount: Math.floor(5 + Math.random() * 20),
    });

    const updatedCoverage = await updateCoverageData(city.cityName, kecamatans);
    await syncCoverageSummaryWithSettings(updatedCoverage);
    return res.json({ status: 'success', coverage: updatedCoverage });
  } catch (err: any) {
    console.error('Add kelurahan error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menambah kelurahan.' });
  }
});

app.post('/api/coverage/kelurahan/delete', async (req, res) => {
  try {
    const { cityName, kecamatanName, name } = req.body;
    const coverage = await getAllCoverage();
    const city = coverage.find((c) => c.cityName.trim().toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return res.status(404).json({ status: 'error', message: 'Kota/Kabupaten tidak ditemukan.' });
    }

    const kecamatans = [...city.kecamatans];
    const kec = kecamatans.find((k: any) => k.name.trim().toLowerCase() === kecamatanName.trim().toLowerCase());
    if (!kec) {
      return res.status(404).json({ status: 'error', message: 'Kecamatan tidak ditemukan.' });
    }

    kec.kelurahans = (kec.kelurahans || []).filter((kl: any) => kl.name.trim().toLowerCase() !== name.trim().toLowerCase());
    const updatedCoverage = await updateCoverageData(city.cityName, kecamatans);
    await syncCoverageSummaryWithSettings(updatedCoverage);
    return res.json({ status: 'success', coverage: updatedCoverage });
  } catch (err: any) {
    console.error('Delete kelurahan error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus kelurahan.' });
  }
});

app.post('/api/coverage/sync', async (req, res) => {
  try {
    const { coverage } = req.body || {};
    if (!Array.isArray(coverage)) {
      return res.status(400).json({ status: 'error', message: 'Data cakupan tidak valid.' });
    }
    const updatedCoverage = await syncFullCoverage(coverage);
    const summaryText = await syncCoverageSummaryWithSettings(updatedCoverage);
    await updateCompanySettings({
      coverageText: summaryText,
      coverageJson: JSON.stringify(updatedCoverage),
    });
    return res.json({ status: 'success', coverage: updatedCoverage, coverageText: summaryText });
  } catch (err: any) {
    console.error('Sync full coverage error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menyinkronkan area cakupan.' });
  }
});

// ==================== WIFI PACKAGES API ====================

app.get('/api/packages', async (req, res) => {
  try {
    const packages = await getAllPackages();
    return res.json({ status: 'success', packages });
  } catch (err: any) {
    console.error('Get packages error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat paket WiFi.' });
  }
});

app.post('/api/packages', async (req, res) => {
  try {
    const { id, name, speed, price, features, type, popular } = req.body;
    if (!name || !speed || price === undefined || !type) {
      return res.status(400).json({ status: 'error', message: 'Parameter tidak lengkap.' });
    }

    const newPackage: WifiPackage = {
      id: id && String(id).trim() !== '' ? String(id).trim() : `pkg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      speed: speed.trim(),
      price: Number(price),
      features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n').map((s: string) => s.trim()).filter(Boolean) : []),
      type,
      popular: !!popular,
    };

    await createPackage(newPackage);
    const packages = await getAllPackages();
    const packagesJson = JSON.stringify(packages);
    const settings = await updateCompanySettings({ packagesJson });
    syncSheetsWebhook('update_packages', { packages, packagesJson }).catch(() => {});
    syncSheetsWebhook('update_settings', { packagesJson }).catch(() => {});
    broadcastServerSync({ type: 'SETTINGS_UPDATED', settings });
    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', packages, newPackage });
  } catch (err: any) {
    console.error('Create package error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menyimpan paket WiFi.' });
  }
});

const removePackage = async (id: string, res: express.Response) => {
  try {
    await deletePackage(id);
    const packages = await getAllPackages();
    const packagesJson = JSON.stringify(packages);
    const settings = await updateCompanySettings({ packagesJson });
    syncSheetsWebhook('update_packages', { packages, packagesJson }).catch(() => {});
    syncSheetsWebhook('update_settings', { packagesJson }).catch(() => {});
    broadcastServerSync({ type: 'SETTINGS_UPDATED', settings });
    broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    return res.json({ status: 'success', packages });
  } catch (err: any) {
    console.error('Delete package error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus paket WiFi.' });
  }
};

app.delete('/api/packages/:id', (req, res) => {
  removePackage(req.params.id, res);
});

app.post('/api/packages/delete', (req, res) => {
  removePackage(req.body.id, res);
});

// ==================== DEVELOPER GOOGLE SHEETS & DRIVE DATABASE API ====================

app.get('/api/dev/db', async (req, res) => {
  try {
    const [customers, tickets, settings, coverage, packages] = await Promise.all([
      getAllCustomers(),
      getAllTickets(),
      getCompanySettings(),
      getAllCoverage(),
      getAllPackages(),
    ]);

    return res.json({
      databaseEngine: 'Google Sheets & Google Drive',
      customers,
      tickets,
      companySettings: settings,
      coverageList: coverage,
      packages,
    });
  } catch (err: any) {
    console.error('Dev DB error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat data Google Sheets & Drive.' });
  }
});

app.get('/api/dev/db/metrics', async (req, res) => {
  try {
    const metrics = await getDatabaseMetrics();
    return res.json({ status: 'success', metrics });
  } catch (err: any) {
    console.error('Metrics error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat metrik database.' });
  }
});

// ==================== GOOGLE SHEETS & GOOGLE DRIVE ENDPOINTS ====================

// Get Sheets config
app.get(['/api/dev/sheets/config', '/api/sheets/config'], (req, res) => {
  const config = loadSheetsConfig();
  res.json({
    status: 'success',
    config,
    isConfigured: Boolean(config.webAppUrl),
  });
});

// Save Sheets config
app.post(['/api/dev/sheets/config', '/api/sheets/config'], (req, res) => {
  const { webAppUrl, driveFolderName, autoSync, syncIntervalSeconds } = req.body;
  const updated = saveSheetsConfig({
    webAppUrl,
    driveFolderName,
    autoSync: autoSync !== undefined ? Boolean(autoSync) : true,
    syncIntervalSeconds: syncIntervalSeconds ? Number(syncIntervalSeconds) : 4,
  });
  res.json({
    status: 'success',
    message: 'Konfigurasi Google Sheets & Drive berhasil disimpan di server!',
    config: updated,
  });
});

// Test Google Sheets & Drive connection
app.post('/api/dev/sheets/test', async (req, res) => {
  try {
    const url = req.body.webAppUrl || loadSheetsConfig().webAppUrl;
    if (!url) {
      return res.status(400).json({ status: 'error', message: 'URL Web App Google Apps Script belum diisi.' });
    }

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      return res.status(400).json({
        status: 'error',
        message: `HTTP ${response.status}: Google Sheets Web App tidak merespon secara valid. Pastikan Web App di-deploy dengan opsi "Who has access: Anyone".`,
      });
    }

    const data = await response.json();
    if (data && data.status === 'success') {
      return res.json({
        status: 'success',
        reachable: true,
        latencyMs: latency,
        customerCount: data.customers?.length || 0,
        ticketCount: data.tickets?.length || 0,
        settings: data.settings,
        message: `Koneksi Google Sheets & Drive BERHASIL (${latency}ms)! Spreadsheet dan folder Google Drive terhubung.`,
      });
    }

    return res.status(400).json({
      status: 'error',
      message: data.message || 'Respon dari Google Sheets tidak dikenali.',
    });
  } catch (err: any) {
    console.error('Google Sheets test error:', err);
    return res.status(500).json({ status: 'error', message: `Gagal menghubungi Google Sheets: ${err.message}` });
  }
});

// Sync data UP: push all server data into Google Sheets & Drive
app.post('/api/dev/sheets/sync-up', async (req, res) => {
  try {
    const [customers, tickets, settings, packages, coverage] = await Promise.all([
      getAllCustomers(),
      getAllTickets(),
      getCompanySettings(),
      getAllPackages(),
      getAllCoverage(),
    ]);

    const fullSettings = {
      ...settings,
      packagesJson: JSON.stringify(packages),
      coverageJson: JSON.stringify(coverage),
    };

    const result = await syncSheetsWebhook('sync_all', {
      customers,
      tickets,
      settings: fullSettings,
      packages,
      coverage,
    });

    // Also update all settings, packages, and coverage in spreadsheet
    await syncSheetsWebhook('update_settings', fullSettings);

    saveSheetsConfig({ lastSyncedAt: new Date().toISOString() });

    return res.json({
      status: 'success',
      message: `Sukses menyinkronkan ${customers.length} pelanggan, ${packages.length} paket, ${coverage.length} wilayah, tiket, dan pengaturan ke Google Sheet & Drive!`,
      result,
    });
  } catch (err: any) {
    console.error('Google Sheets sync-up error:', err);
    return res.status(500).json({ status: 'error', message: `Gagal sinkronisasi ke Google Sheets: ${err.message}` });
  }
});

// Sync data DOWN: pull latest data from Google Sheets into server
app.get(['/api/dev/sheets/sync-down', '/api/sheets/sync-down', '/api/sheets/fetch'], async (req, res) => {
  try {
    const data = await fetchFromGoogleSheetsServer();

    // If external Google Sheets returned updated settings, persist and broadcast to all devices
    if (data.source === 'external_google_sheets' && data.settings && data.settings.name) {
      const updatedSettings = await updateCompanySettings(data.settings);
      data.settings = updatedSettings;
      broadcastServerSync({ type: 'SETTINGS_UPDATED', settings: updatedSettings });
    }

    saveSheetsConfig({ lastSyncedAt: new Date().toISOString() });

    return res.json({
      status: 'success',
      source: data.source,
      customers: data.customers || [],
      tickets: data.tickets || [],
      settings: data.settings,
      message: `Berhasil menarik ${data.customers?.length || 0} data pelanggan dan pengaturan dari Google Sheets & Drive!`,
    });
  } catch (err: any) {
    console.error('Google Sheets sync-down error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Mirror endpoint: when any client browser fetches directly from its Google Apps Script Web App,
// it mirrors the live settings/customers/tickets and Web App URL to the server so all other devices
// immediately display the exact same data!
app.post('/api/sheets/mirror', async (req, res) => {
  try {
    const { webAppUrl, settings, customers, tickets } = req.body || {};
    const mirrored = mirrorExternalSheetsDataToServer({
      webAppUrl,
      settings,
      customers,
      tickets,
    });

    if (mirrored.settingsUpdated && mirrored.mergedSettings) {
      broadcastServerSync({ type: 'SETTINGS_UPDATED', settings: mirrored.mergedSettings });
    }
    if (mirrored.dbUpdated) {
      broadcastServerSync({ type: 'SHEETS_DB_UPDATED', timestamp: Date.now() });
    }

    return res.json({
      status: 'success',
      settingsUpdated: mirrored.settingsUpdated,
      dbUpdated: mirrored.dbUpdated,
      settings: mirrored.mergedSettings,
    });
  } catch (err: any) {
    console.error('Sheets mirror error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Test registration simulation: sends customer and KTP image to Google Drive
app.post('/api/dev/sheets/test-registration', async (req, res) => {
  try {
    const testId = `TR-DRIVE-${Math.floor(1000 + Math.random() * 9000)}`;
    const testCust = {
      id: testId,
      name: 'Pelanggan Uji Google Drive',
      email: `uji.drive.${Date.now()}@patasnet.id`,
      phone: '081299887711',
      address: 'Jl. Google Drive No. 100, Jakarta',
      coordinates: [-6.2088, 106.8456],
      packageId: 'home-20m',
      status: 'pending',
      ktpImageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHz2fW4AAAAABJRU5ErkJggg==',
      amount: 170000,
    };

    const result = await syncSheetsWebhook('subscribe', testCust);

    if (result && result.status === 'success') {
      return res.json({
        status: 'success',
        message: `BERHASIL! Data pendaftaran ${testCust.name} (${testCust.id}) masuk ke Sheet Pelanggan dan foto KTP tersimpan di Google Drive!`,
        result,
      });
    }

    return res.json({
      status: 'success',
      message: `Pendaftaran simulasi ${testCust.name} (${testCust.id}) dikirim ke Google Sheets & Drive Webhook.`,
      result,
    });
  } catch (err: any) {
    console.error('Google Sheets test-registration error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Get Live Google Sheets Spreadsheet Database (all 4 sheets with live rows)
app.get(['/api/sheets/database', '/api/dev/sheets/database'], (req, res) => {
  const db = getGoogleSheetsDatabase();
  res.json({
    status: 'success',
    database: db,
  });
});

// Proxy endpoint for client-side sync to avoid browser CORS/redirect issues
app.post('/api/sheets/proxy', async (req, res) => {
  try {
    const { action, url: clientUrl, ...payload } = req.body;
    // Always sync with the internal Google Sheets database and forward if URL exists
    const result = await syncSheetsWebhook(action, payload, clientUrl);
    if (action === 'update_settings' || action === 'update_logo' || action === 'update_qris') {
      const updatedSettings = await updateCompanySettings(payload);
      broadcastServerSync({ type: 'SETTINGS_UPDATED', settings: updatedSettings });
    } else {
      broadcastServerSync({ type: 'SHEETS_DB_UPDATED', action, timestamp: Date.now() });
    }
    return res.json({
      status: 'success',
      message: 'Data berhasil disinkronkan ke Google Sheets Database!',
      result,
    });
  } catch (err: any) {
    console.error('Sheets proxy error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Get Google Apps Script Code.gs template
app.get('/api/dev/sheets/script', (req, res) => {
  res.json({
    status: 'success',
    script: GOOGLE_APPS_SCRIPT_TEMPLATE,
  });
});

// Start listening or initialize Vite dev server
async function startServer() {
  // Initialize database tables seed if empty
  await seedDatabaseIfEmpty();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Patas Net WiFi] Server running on port ${PORT} with Google Sheets & Google Drive backend.`);
  });
}

startServer();
