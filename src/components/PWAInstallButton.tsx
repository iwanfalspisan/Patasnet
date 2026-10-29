import React, { useState } from 'react';
import { Smartphone, Download, X, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

interface PWAInstallButtonProps {
  companyName?: string;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  companyName = 'Patas.Net',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 flex items-center justify-center'
            : 'p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center'
        }
        title="Unduh / Install Aplikasi"
        aria-label="Unduh Aplikasi"
      >
        <Download className="w-4 h-4 shrink-0" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-xs">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block">
                    Android APK & PWA Ready
                  </span>
                  <h3 className="text-base font-black">
                    Pasang Aplikasi {companyName} di HP
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {isInstallable && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Perangkat Anda Mendukung Instalasi Langsung!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Klik tombol di bawah untuk langsung memasang aplikasi <strong>{companyName}</strong> ke layar utama HP Android / perangkat Anda:
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setShowModal(false);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pasang Aplikasi Sekarang (1-Klik)</span>
                  </button>
                </div>
              )}

              {/* Cara 1: Install Langsung dari Browser Chrome Android / Safari iOS */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {isIOS
                      ? 'Cara Pasang di iPhone / iPad (iOS Safari):'
                      : 'Cara 1: Pasang Langsung di HP Android (Tanpa File APK):'}
                  </span>
                </h4>
                {isIOS ? (
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <li>
                      Ketuk ikon <strong>Bagikan (Share)</strong> di bagian bawah browser Safari.
                    </li>
                    <li>
                      Geser ke bawah lalu pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                    </li>
                    <li>
                      Ketuk <strong>Tambah</strong>. Aplikasi {companyName} akan muncul di layar HP Anda!
                    </li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <li>
                      Buka website ini menggunakan browser <strong>Google Chrome</strong> di HP Android.
                    </li>
                    <li>
                      Ketuk ikon <strong>Titik Tiga (⋮)</strong> di pojok kanan atas Chrome.
                    </li>
                    <li>
                      Pilih menu <strong>"Instal aplikasi" (Install app)</strong> atau <strong>"Tambahkan ke layar utama"</strong>.
                    </li>
                    <li>
                      Aplikasi <strong>{companyName}</strong> otomatis terpasang penuh di HP seperti aplikasi Play Store (tanpa bar browser & menu berada di bawah).
                    </li>
                  </ol>
                )}
              </div>

              {/* Cara 2: Export menjadi File .APK / Google Play Store */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2.5">
                <h4 className="font-extrabold text-blue-950 flex items-center gap-2 text-xs">
                  <Download className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Cara 2: Ubah Menjadi File .APK Android (Siap Kirim WA / Play Store)</span>
                </h4>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Website ini sudah dilengkapi <strong>Web App Manifest & Service Worker (PWA Standar Android)</strong>. Untuk mengunduh file mentah <strong>.APK</strong> atau <strong>.AAB</strong> secara gratis dalam 1 menit:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-700 leading-relaxed">
                  <li>
                    Pastikan website ini sudah di-online-kan di <strong>Vercel</strong> (contoh: <code>https://patasnet.vercel.app</code>).
                  </li>
                  <li>
                    Buka situs resmi pembuat APK: <strong>https://www.pwabuilder.com</strong>
                  </li>
                  <li>
                    Masukkan link Vercel website Anda, lalu klik <strong>Start</strong> &rarr; <strong>Package for store</strong>.
                  </li>
                  <li>
                    Pada bagian <strong>Android</strong>, klik <strong>Download Package</strong> untuk langsung mendapatkan file <strong>.APK</strong> (bisa langsung dibagikan lewat WhatsApp ke pelanggan) dan file <strong>.AAB</strong> (untuk Google Play Store).
                  </li>
                </ol>
                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] transition"
                >
                  <span>Buka PWABuilder.com (Generator APK Gratis)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;
