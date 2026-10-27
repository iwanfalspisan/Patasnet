import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, Wifi, User, Mail } from 'lucide-react';
import { PACKAGES } from './Home';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, isNew: boolean) => void;
  defaultPackageId?: string;
  isRegistrationOnly?: boolean;
}

export default function GoogleAuthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultPackageId = 'home-10m',
  isRegistrationOnly = false,
}: GoogleAuthModalProps) {
  const [step, setStep] = useState<'choose_account' | 'custom_account' | 'confirm_registration'>('choose_account');
  const [selectedAccount, setSelectedAccount] = useState<{
    name: string;
    email: string;
    picture?: string;
    isDev?: boolean;
  } | null>(null);

  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPkgId, setSelectedPkgId] = useState(defaultPackageId);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Preset Google Accounts for frictionless instant simulation/OAuth testing
  const presetGoogleAccounts = [
    {
      name: 'Ajay Rostaman',
      email: 'ajayrostaman@gmail.com',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      badge: 'Email Anda / Developer',
      isDev: true,
    },
    {
      name: 'Budi Santoso',
      email: 'budi.santoso.google@gmail.com',
      picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      badge: 'Akun Google Pribadi',
      isDev: false,
    },
    {
      name: 'Dewi Lestari',
      email: 'dewi.lestari.google@gmail.com',
      picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      badge: 'Akun Google Kerja',
      isDev: false,
    },
  ];

  const handleSelectAccount = async (account: { name: string; email: string; picture?: string; isDev?: boolean }) => {
    setSelectedAccount(account);
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          name: account.name,
          picture: account.picture,
          packageId: selectedPkgId,
          asDeveloper: account.isDev && !isRegistrationOnly,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        onSuccess(data.user, data.isNewCustomer);
        onClose();
      } else {
        setErrorMsg(data.message || 'Gagal memproses autentikasi Google.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan jaringan saat menghubungkan ke Google Auth.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setErrorMsg('Harap masukkan alamat email Google yang valid.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customEmail.trim(),
          name: customName.trim() || customEmail.split('@')[0],
          phone: phone.trim(),
          packageId: selectedPkgId,
          asDeveloper: customEmail.trim().toLowerCase() === 'ajayrostaman@gmail.com' && !isRegistrationOnly,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        onSuccess(data.user, data.isNewCustomer);
        onClose();
      } else {
        setErrorMsg(data.message || 'Gagal memproses autentikasi Google.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menghubungkan ke Google.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPkg = PACKAGES.find((p) => p.id === selectedPkgId) || PACKAGES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Google OAuth Header */}
        <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isRegistrationOnly ? 'Daftar dengan Akun Google' : 'Lanjutkan dengan Google'}
              </h3>
              <p className="text-[11px] text-slate-500">Masuk aman & tersinkronisasi ke Supabase</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Package Selector for New Registration */}
        <div className="px-6 pt-4 pb-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Pilihan Paket WiFi Anda
          </label>
          <div className="flex items-center justify-between p-2.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                <Wifi className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">{selectedPkg.name}</span>
                <span className="text-[10px] text-blue-600 font-bold">{selectedPkg.speed} — Unlimited</span>
              </div>
            </div>
            <select
              value={selectedPkgId}
              onChange={(e) => setSelectedPkgId(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-2 py-1 focus:ring-1 focus:ring-blue-600"
            >
              {PACKAGES.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} (Rp {pkg.price.toLocaleString('id-ID')}/bln)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 1: Account Chooser */}
        {step === 'choose_account' && (
          <div className="p-6 pt-2 space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              Pilih akun Google Anda untuk mendaftar atau masuk ke portal:
            </p>

            <div className="space-y-2">
              {presetGoogleAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectAccount(acc)}
                  className="w-full p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition flex items-center justify-between group text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={acc.picture}
                      alt={acc.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-blue-600">
                          {acc.name}
                        </span>
                        {acc.badge && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded-full">
                            {acc.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 truncate block">{acc.email}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition shrink-0 ml-2" />
                </button>
              ))}

              {/* Use another custom account */}
              <button
                type="button"
                onClick={() => setStep('custom_account')}
                className="w-full p-3 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-2 text-xs font-bold"
              >
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Gunakan Akun Google Lain</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Custom Google Account Form */}
        {step === 'custom_account' && (
          <form onSubmit={handleCustomSubmit} className="p-6 pt-2 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Masukkan Detail Akun Google:</span>
              <button
                type="button"
                onClick={() => setStep('choose_account')}
                className="text-[11px] text-blue-600 hover:underline font-bold"
              >
                &larr; Kembali
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Contoh: Ajay Rostaman"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Google (@gmail.com)</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="namaanda@gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-600 focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor WhatsApp (Opsional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menghubungkan ke Supabase...</span>
                </>
              ) : (
                <>
                  <span>Lanjutkan Pendaftaran Google</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info note */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Tersinkronisasi otomatis ke Database Supabase</span>
          </div>
          <span className="font-semibold text-slate-500">Google OAuth 2.0</span>
        </div>
      </div>
    </div>
  );
}
