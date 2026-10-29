import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, Download, X, CheckCircle2, Sparkles, Monitor } from 'lucide-react';
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

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

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

  const modalContent =
    showModal && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <div
              className="relative w-full max-w-md my-auto rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-5 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block">
                      Aplikasi Resmi {companyName}
                    </span>
                    <h3 className="text-sm sm:text-base font-black leading-tight">
                      Install Aplikasi {companyName}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {isInstallable ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 font-extrabold">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Perangkat Anda Siap Menginstal Aplikasi!</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Klik tombol di bawah untuk langsung memasang aplikasi <strong>{companyName}</strong> di layar utama perangkat Anda:
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
                      <span>Install Sekarang (1-Klik)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-[11px] text-blue-900 leading-relaxed">
                    Pasang aplikasi <strong>{companyName}</strong> di HP atau laptop Anda untuk akses lebih cepat, cek tagihan, dan lapor gangguan langsung dari layar utama.
                  </div>
                )}

                {/* Panduan HP Android / iOS */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {isIOS
                        ? 'Cara Pasang di iPhone / iPad (Safari):'
                        : 'Cara Pasang di HP Android (Chrome):'}
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
                        Ketuk <strong>Tambah</strong> di pojok kanan atas. Aplikasi {companyName} siap digunakan!
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                      <li>
                        Ketuk ikon <strong>Titik Tiga (⋮)</strong> di pojok kanan atas browser <strong>Google Chrome</strong>.
                      </li>
                      <li>
                        Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke layar utama"</strong>.
                      </li>
                      <li>
                        Ketuk <strong>Instal</strong>, maka aplikasi <strong>{companyName}</strong> otomatis terpasang di HP Anda.
                      </li>
                    </ol>
                  )}
                </div>

                {/* Panduan Laptop / PC */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs">
                    <Monitor className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Cara Pasang di Laptop / PC (Chrome / Edge):</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Klik ikon <strong>Install / Unduh</strong> di sebelah kanan kolom alamat URL (Address Bar) browser Anda, lalu klik <strong>Instal</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition active:scale-98"
                >
                  Mengerti & Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

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
      {modalContent}
    </>
  );
};

export default PWAInstallButton;
