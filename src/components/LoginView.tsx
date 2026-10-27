import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ShieldCheck,
  Wifi,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle,
  AlertTriangle,
  LogIn,
  UserPlus,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Logo from './Logo';
import GoogleAuthModal from './GoogleAuthModal';
import { PACKAGES } from './Home';
import { requestPasswordResetLocally, resetCustomerPasswordLocally } from '../lib/clientFallback';

interface LoginViewProps {
  onLoginSuccess: (userData: any) => void;
  onNavigateToSubscribe: () => void;
  companyName: string;
  themeColor?: string;
  logoUrl?: string;
  tagline?: string;
}

export default function LoginView({
  onLoginSuccess,
  onNavigateToSubscribe,
  companyName,
  logoUrl,
  tagline,
}: LoginViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login');
  const [role, setRole] = useState<'customer' | 'admin' | 'developer'>('customer');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessData, setForgotSuccessData] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Quick register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPackageId, setRegPackageId] = useState(PACKAGES[0].id);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Google Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          isAdmin: role === 'admin',
        }),
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.message || 'Login gagal. Periksa kembali email dan password Anda.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Terjadi kendala jaringan saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword.trim()) {
      setErrorMessage('Harap lengkapi semua isian formulir pendaftaran.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          phone: regPhone.trim(),
          password: regPassword,
          address: 'Alamat dalam proses konfirmasi pemasangan',
          coordinates: [-6.2088, 106.8456],
          packageId: regPackageId,
          rentStb: false,
          ktpImageBase64: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        }),
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSuccessMessage('Pendaftaran berhasil & data tersimpan di Supabase! Mengalihkan ke portal Anda...');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1000);
      } else {
        setErrorMessage(data.message || 'Pendaftaran gagal. Periksa kembali data Anda.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Gagal menghubungi server pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!forgotEmail.trim()) {
      setErrorMessage('Harap masukkan alamat email Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = requestPasswordResetLocally(forgotEmail.trim());
      if (res.success) {
        setForgotSuccessData(res);
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Gagal memproses permintaan reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('Kata sandi baru minimal 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const ok = resetCustomerPasswordLocally(forgotEmail, newPassword);
      if (ok) {
        setSuccessMessage('Kata sandi berhasil diperbarui! Status akun di local storage telah dipulihkan menjadi ACTIVE.');
        setPassword(newPassword);
        setEmail(forgotEmail);
        setTimeout(() => {
          setAuthMode('login');
          setForgotSuccessData(null);
        }, 1500);
      } else {
        setErrorMessage('Gagal memperbarui kata sandi di penyimpanan.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat menyimpan kata sandi baru.');
    } finally {
      setLoading(false);
    }
  };

  const autofillCredential = (targetRole: 'customer' | 'admin' | 'developer') => {
    setRole(targetRole);
    setAuthMode('login');
    setErrorMessage('');
    if (targetRole === 'customer') {
      setEmail('budi@gmail.com');
      setPassword('user123');
    } else if (targetRole === 'admin') {
      setEmail('admin@patasnet.id');
      setPassword('admin');
    } else {
      setEmail('ajayrostaman@gmail.com');
      setPassword('pengelola123');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 font-sans text-slate-100">
      <div className="max-w-md w-full relative z-10">
        {/* Glow ambient background effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-indigo-600 rounded-3xl blur-xl opacity-30 pointer-events-none" />

        <div className="relative bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <div className="inline-block p-1 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
              <Logo companyName={companyName} logoUrl={logoUrl} tagline={tagline} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {authMode === 'login'
                ? 'Portal Masuk Layanan'
                : authMode === 'forgot-password'
                ? 'Pemulihan Kata Sandi'
                : authMode === 'reset-password'
                ? 'Atur Ulang Kata Sandi'
                : 'Daftar Pelanggan Baru'}
            </h2>
            <p className="text-xs text-slate-400">
              {authMode === 'login'
                ? `Kelola tagihan, cek paket, dan jaringan ${companyName}`
                : authMode === 'forgot-password'
                ? 'Minta tautan reset via email & perbarui status akun di local storage'
                : authMode === 'reset-password'
                ? 'Buat kata sandi baru untuk memulihkan akun Anda'
                : `Daftar cepat WiFi dan nikmati koneksi internet unlimited`}
            </p>
          </div>

          {/* Mode Switcher: Masuk vs Daftar Baru vs Lupa Password */}
          <div className="p-1 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setRole('customer');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                authMode === 'register'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Baru</span>
            </button>
            {(authMode === 'forgot-password' || authMode === 'reset-password') && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-600/30 text-amber-300 border border-amber-500/40 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset Sandi</span>
              </button>
            )}
          </div>

          {/* GOOGLE ONE-CLICK AUTH BUTTON */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-98 group border border-slate-200"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span className="font-extrabold tracking-tight">
                {authMode === 'login' ? 'Masuk dengan Akun Google' : 'Daftar Cepat dengan Google'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full ml-auto">
                Sync Supabase
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold shrink-0">
              atau gunakan email & password
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-red-950/50 border border-red-800/80 rounded-2xl flex items-center gap-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/80 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-200">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              {/* Role Picker Pills */}
              <div className="p-1 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setRole('customer');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                    role === 'customer'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pelanggan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('admin');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                    role === 'admin'
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admin WiFi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('developer');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                    role === 'developer'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Developer
                </button>
              </div>

              {/* Email Field */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Alamat Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      role === 'admin'
                        ? 'admin@patasnet.id'
                        : role === 'developer'
                        ? 'ajayrostaman@gmail.com'
                        : 'budi@gmail.com'
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-white font-mono text-xs"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Kata Sandi *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot-password');
                      setForgotEmail(email);
                      setErrorMessage('');
                      setSuccessMessage('');
                      setForgotSuccessData(null);
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold hover:underline"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-white text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : authMode === 'forgot-password' ? (
            /* FORGOT PASSWORD FORM & SIMULATED FLOW */
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Kembali ke Login"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    Permintaan Reset Password
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Simulasi pengiriman tautan & pembaruan status akun di local storage
                  </p>
                </div>
              </div>

              {forgotSuccessData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-950/60 border border-emerald-700/80 rounded-2xl flex items-start gap-3 text-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-xs">Tautan Reset Password Terkirim!</p>
                      <p className="text-[11px] text-emerald-300 leading-relaxed">
                        Sistem telah memperbarui status akun di local storage menjadi{' '}
                        <strong className="font-mono bg-emerald-900/80 text-emerald-100 px-1.5 py-0.5 rounded border border-emerald-600/40">
                          PENDING (Reset Requested)
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Simulated Email & Reset Link Box */}
                  <div className="p-4 bg-slate-950 text-slate-100 rounded-2xl space-y-3 border border-slate-800 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px]">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> SIMULASI EMAIL RESET TERKIRIM
                      </span>
                      <span className="font-mono text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        Local Storage
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] leading-relaxed">
                      <p>
                        <span className="text-slate-400">Penerima:</span>{' '}
                        <strong className="text-white font-mono">{forgotSuccessData.user?.email || forgotEmail}</strong>
                      </p>
                      {forgotSuccessData.user && (
                        <>
                          <p>
                            <span className="text-slate-400">Nama Pelanggan:</span>{' '}
                            <strong className="text-white">{forgotSuccessData.user.name}</strong>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-400">Status Saat Ini di LocalStorage:</span>
                            <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono border border-amber-500/30">
                              {forgotSuccessData.user.status || 'pending'} (Reset Diminta)
                            </span>
                          </p>
                        </>
                      )}
                      <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-800 break-all">
                        Tautan Reset:{' '}
                        <span className="font-mono text-emerald-300 text-[10px]">
                          {forgotSuccessData.resetLink}
                        </span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('reset-password');
                          setNewPassword('');
                          setConfirmPassword('');
                          setErrorMessage('');
                          setSuccessMessage('');
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Buka Tautan Reset & Masukkan Password Baru</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setForgotSuccessData(null);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition text-xs"
                  >
                    Kembali ke Halaman Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Ketik alamat email Anda yang terdaftar. Sistem akan mensimulasikan pengiriman tautan reset via email dan memperbarui status akun Anda di local storage menjadi pending.
                  </p>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="forgot-email">
                      Alamat Email *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        id="forgot-email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="contoh: budi@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-white font-mono text-xs"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengirim Tautan...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Kirim Tautan Reset via Email</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="w-full py-2 text-slate-400 hover:text-white font-bold transition text-xs text-center"
                  >
                    Batal, Kembali ke Login
                  </button>
                </form>
              )}
            </div>
          ) : authMode === 'reset-password' ? (
            /* RESET PASSWORD FORM */
            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot-password')}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Kembali"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    Buat Kata Sandi Baru
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Atur ulang password untuk akun: <strong className="text-white font-mono">{forgotEmail}</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Kata Sandi Baru *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none text-white text-xs"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Konfirmasi Kata Sandi *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none text-white text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Simpan Password & Pulihkan Akun (Aktif)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full py-2 text-slate-400 hover:text-white font-bold transition text-xs text-center"
              >
                Batal, Kembali ke Login
              </button>
            </form>
          ) : (
            /* QUICK REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nama Lengkap *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nama calon pelanggan"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Alamat Email *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@anda.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    No. WhatsApp *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Paket WiFi
                </label>
                <select
                  value={regPackageId}
                  onChange={(e) => setRegPackageId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                >
                  {PACKAGES.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.speed}) - Rp {pkg.price.toLocaleString('id-ID')}/bln
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Buat Kata Sandi Akun *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mendaftarkan ke Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>Daftar Sekarang & Masuk Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={onNavigateToSubscribe}
                  className="text-[11px] text-blue-400 hover:underline font-bold"
                >
                  Gunakan Formulir Lengkap (Pilih Pin Peta GPS & Upload KTP) &rarr;
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Credentials Autofill Chips */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Akses Cepat Pengujian (1-Click Autofill):</span>
              <span className="text-blue-400 font-normal lowercase">klik untuk isi otomatis</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => autofillCredential('customer')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left transition group"
              >
                <span className="block text-[9px] font-bold text-blue-400 uppercase">Pelanggan</span>
                <span className="block text-[10px] font-mono text-slate-300 truncate">budi@...</span>
              </button>

              <button
                type="button"
                onClick={() => autofillCredential('admin')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition group"
              >
                <span className="block text-[9px] font-bold text-indigo-400 uppercase">Admin WiFi</span>
                <span className="block text-[10px] font-mono text-slate-300 truncate">admin@...</span>
              </button>

              <button
                type="button"
                onClick={() => autofillCredential('developer')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition group"
              >
                <span className="block text-[9px] font-bold text-amber-400 uppercase">Developer</span>
                <span className="block text-[10px] font-mono text-slate-300 truncate">ajayrost...</span>
              </button>
            </div>
          </div>

          {/* Database Footer Status */}
          <div className="pt-2 text-center flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Tersambung langsung ke PostgreSQL & Supabase Database</span>
          </div>
        </div>
      </div>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={(user) => onLoginSuccess(user)}
        isRegistrationOnly={authMode === 'register'}
      />
    </div>
  );
}
