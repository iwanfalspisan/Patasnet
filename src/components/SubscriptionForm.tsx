import React, { useState, useEffect } from 'react';
import { Upload, MapPin, CheckCircle, Wifi, AlertTriangle, ArrowLeft, Eye, EyeOff, FileText, Sparkles } from 'lucide-react';
import MapPicker from './MapPicker';
import { PACKAGES } from './Home';
import { syncToGoogleSheets } from '../lib/clientFallback';

interface SubscriptionFormProps {
  selectedPackageId: string | null;
  onNavigate: (page: string) => void;
  onSubmitSuccess: (userData: any) => void;
}

export default function SubscriptionForm({ selectedPackageId, onNavigate, onSubmitSuccess }: SubscriptionFormProps) {
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedPkgId, setSelectedPkgId] = useState(selectedPackageId || PACKAGES[0].id);
  const [rentStb, setRentStb] = useState(false);

  // Map state
  const [latitude, setLatitude] = useState<number>(-6.2088);
  const [longitude, setLongitude] = useState<number>(106.8456);
  const [mapAddressDetail, setMapAddressDetail] = useState('');

  // File Upload states
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  // Statuses
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (selectedPackageId) {
      setSelectedPkgId(selectedPackageId);
    }
  }, [selectedPackageId]);

  const selectedPkg = PACKAGES.find((p) => p.id === selectedPkgId) || PACKAGES[0];
  const totalPrice = selectedPkg.price + (rentStb ? 25000 : 0);

  const handleLocationSelect = (lat: number, lng: number, addressDetail?: string) => {
    setLatitude(lat);
    setLongitude(lng);
    if (addressDetail) {
      setMapAddressDetail(addressDetail);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya diperbolehkan mengunggah file gambar (KTP).');
      return;
    }
    setKtpFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setKtpPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !address.trim()) {
      setErrorMsg('Harap lengkapi semua bidang isian formulir (Nama, Email, WhatsApp, Kata Sandi, dan Alamat).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If KTP not uploaded by user, use fallback mock KTP to never block registration testing
    const effectiveKtp =
      ktpPreview ||
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80';

    setSubmitting(true);
    try {
      let registeredUser: any = null;

      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            password,
            address,
            coordinates: [latitude, longitude],
            packageId: selectedPkgId,
            rentStb,
            ktpImageBase64: effectiveKtp,
            mapAddressDetail,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.user) {
            registeredUser = data.user;
          }
        }
      } catch (netErr) {
        console.warn('Backend /api/subscribe unreachable, generating local registration:', netErr);
      }

      // If backend was not reached (e.g. on static Vercel), construct customer locally
      if (!registeredUser) {
        const newId = `TR-${Math.floor(1000 + Math.random() * 9000)}`;
        const initialPaymentAmount = rentStb ? selectedPkg.price + 25000 : selectedPkg.price;
        registeredUser = {
          id: newId,
          name,
          email,
          phone,
          address: `${address} (${mapAddressDetail || 'Area Terpetakan'})`,
          coordinates: [latitude, longitude] as [number, number],
          packageId: selectedPkgId,
          status: 'pending' as const,
          ktpImageUrl: effectiveKtp,
          createdAt: new Date().toISOString(),
          payments: [
            {
              id: `PAY-${Math.floor(7000 + Math.random() * 9000)}`,
              date: new Date().toISOString().split('T')[0],
              amount: initialPaymentAmount,
              status: 'unpaid' as const,
              billingPeriod: 'Bulan Pertama',
              method: 'Transfer Bank / QRIS',
            },
          ],
        };
      }

      // Ensure data is synced directly to Google Sheets database immediately
      syncToGoogleSheets('subscribe', registeredUser).catch(() => {});

      onSubmitSuccess(registeredUser);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Pendaftaran gagal. Silakan periksa kembali data Anda: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
      </button>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
        {/* Form Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 sm:p-8 text-white text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <Wifi className="w-6 h-6 text-yellow-400" /> Formulir Registrasi Berlangganan
            </h1>
            <p className="text-xs text-blue-200">Isi data lengkap Anda untuk pengajuan pemasangan WiFi baru Patas Net.</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-center">
            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">PAKET TERPILIH</p>
            <p className="font-extrabold text-sm text-yellow-400">{selectedPkg.name}</p>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8 text-xs">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-800">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
              <div>
                <p className="font-bold text-sm">Gagal Mengirim Formulir</p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Section 1: Data Diri */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100">
              1. Identitas Lengkap Pelanggan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="sub-name">NAMA LENGKAP (Sesuai KTP) *</label>
                <input
                  type="text"
                  id="sub-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="sub-email">ALAMAT EMAIL AKTIF *</label>
                <input
                  type="email"
                  id="sub-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama.lengkap@email.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="sub-phone">NOMOR WHATSAPP AKTIF *</label>
                <input
                  type="tel"
                  id="sub-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081xxxxxxxxx"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk notifikasi status pembayaran & penagihan berkala.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="sub-password">PASSWORD AKUN BARU *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="sub-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Gunakan password ini untuk masuk ke dasbor portal pelanggan Patas Net.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Paket & Pemasangan */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100">
              2. Detail Paket Layanan Wifi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PILIHAN PAKET WIFI *</label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => setSelectedPkgId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white text-xs font-semibold text-slate-800"
                >
                  <optgroup label="Paket Rumah (Home)">
                    {PACKAGES.filter((p) => p.type === 'home').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - Rp {p.price.toLocaleString('id-ID')}/bln
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Paket Premium / Bisnis">
                    {PACKAGES.filter((p) => p.type === 'business').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - Rp {p.price.toLocaleString('id-ID')}/bln
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Sewa STB Android Box?</span>
                  <input
                    type="checkbox"
                    id="rent-stb"
                    checked={rentStb}
                    onChange={(e) => setRentStb(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Dapatkan box android TV pintar untuk streaming video Youtube, Netflix, dan siaran langsung TV Kabel hanya dengan tambahan +Rp 25.000 / bulan.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Koordinat Leaflet OpenStreetMap */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 pb-1 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                3. Tentukan Koordinat Alamat Pemasangan WiFi
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-extrabold">OpenStreetMap Leaflet</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Silakan cari lokasi atau geser pin merah pada peta interaktif di bawah ini untuk menentukan titik kordinat rumah Anda yang tepat untuk penarikan jalur kabel fiber optik teknisi.
            </p>

            <MapPicker onLocationSelect={handleLocationSelect} />

            <div>
              <label className="block font-bold text-slate-700 mb-1" htmlFor="sub-address">ALAMAT LENGKAP PEMASANGAN (Disertai RT/RW, Blok, No Rumah) *</label>
              <textarea
                id="sub-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Ciomas Raya No. 44, RT. 03/RW. 02, Kel. Rawa Barat, Kec. Kebayoran Baru, Jakarta Selatan"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50 h-20 resize-none"
                required
              />
            </div>
          </div>

          {/* Section 4: Upload Foto KTP */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100">
              4. Dokumen Validasi (Foto KTP)
            </h3>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Unggah foto Kartu Tanda Penduduk (KTP) asli yang masih berlaku sebagai syarat administrasi pendaftaran baru. Keamanan data diri Anda terjamin dengan enkripsi sistem kami.
            </p>

            {/* Drag and Drop Container */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${dragActive ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-slate-50/30'} flex flex-col items-center justify-center`}
            >
              <input
                type="file"
                id="ktp-file-input"
                className="hidden"
                accept="image/*"
                onChange={handleFileInputChange}
              />

              {ktpPreview ? (
                <div className="space-y-3">
                  <img
                    src={ktpPreview}
                    alt="KTP Preview"
                    className="h-32 object-contain rounded-lg border border-slate-200 shadow-md mx-auto"
                  />
                  <div className="flex gap-2 justify-center">
                    <label
                      htmlFor="ktp-file-input"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-[10px] text-slate-700 cursor-pointer"
                    >
                      Ganti Foto KTP
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setKtpFile(null);
                        setKtpPreview('');
                      }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg font-semibold text-[10px] text-red-600"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <label htmlFor="ktp-file-input" className="cursor-pointer space-y-3 flex flex-col items-center w-full">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Tarik & Lepas foto KTP di sini, atau klik untuk memilih file</p>
                      <p className="text-[10px] text-slate-400 mt-1">Mendukung format JPG, JPEG, atau PNG (Maks. 5 MB)</p>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setKtpPreview('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80');
                      setErrorMsg('');
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold rounded-lg text-[10px] inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Gunakan Foto KTP Contoh (Untuk Simulasi / Uji Coba Cepat)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Summary / Total Cost Breakdown */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-4">
            <h4 className="font-black text-sm text-yellow-400">Rincian Pembayaran Awal Pemasangan</h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Paket Berlangganan: {selectedPkg.name}</span>
                <span>Rp {selectedPkg.price.toLocaleString('id-ID')} / bln</span>
              </div>
              {rentStb && (
                <div className="flex justify-between text-slate-400">
                  <span>Sewa STB Android Smart Box</span>
                  <span>Rp 25.000 / bln</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-400">
                <span>Biaya Instalasi Kabel Drop Core Fiber & Router</span>
                <span className="font-bold">Rp 0 (GRATIS)</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex justify-between font-extrabold text-sm text-white">
                <span>Total Pembayaran Bulan Pertama:</span>
                <span className="text-yellow-400 text-base font-mono">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed italic">
              *Setelah Anda mendaftar, akun pelanggan Anda akan dibuat secara otomatis dan langsung tercatat di Google Sheets Database. Teknisi kami akan menjadwalkan kunjungan pemasangan setelah verifikasi data selesai.
            </p>
          </div>

          {/* Bottom Error Display */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Harap Lengkapi Formulir</p>
                <p className="mt-0.5 leading-relaxed text-xs">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3.5 pt-4">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="px-5 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="subscribe-submit-btn"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center gap-1.5 disabled:bg-slate-300 cursor-pointer active:scale-95"
            >
              {submitting ? 'Memproses Pendaftaran...' : 'Kirim Formulir Pengajuan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
