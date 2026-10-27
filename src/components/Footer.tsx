import React, { useState } from 'react';
import { Wifi, Phone, Mail, MapPin, Send, HelpCircle, X } from 'lucide-react';
import { CompanySettings } from '../types';
import Logo from './Logo';

interface FooterProps {
  onNavigate: (page: string) => void;
  companyName?: string;
  logoUrl?: string;
  companySettings?: CompanySettings;
}

export default function Footer({ onNavigate, companyName, logoUrl, companySettings }: FooterProps) {
  const [showCsModal, setShowCsModal] = useState(false);
  const [csMessage, setCsMessage] = useState('');
  const [csName, setCsName] = useState('');

  const currentCompanyName = companyName || companySettings?.name || 'Patas Net WiFi';
  const currentLegalName = companySettings?.legalName || 'PT. AMANUSA TELEMEDIA';
  const currentAddress = companySettings?.address || 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110';
  const currentPhone = companySettings?.phoneNumber || companySettings?.whatsappNumber || '+62 899-3299-977';
  const currentEmail = companySettings?.email || 'cs@patasnet.id';
  const waRaw = companySettings?.whatsappNumber || '081234567890';
  const waClean = waRaw.replace(/[^0-9]/g, '').replace(/^0/, '62');

  const fbUrl = companySettings?.facebookUrl || 'https://facebook.com';
  const igUrl = companySettings?.instagramUrl || 'https://instagram.com';
  const ytUrl = companySettings?.youtubeUrl || 'https://youtube.com';

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csMessage.trim() || !csName.trim()) return;

    const text = `Halo Customer Service ${currentCompanyName},%0ANama saya *${csName}*.%0ASaya butuh bantuan/mengalami kendala berikut:%0A%0A"${csMessage}"%0A%0AMohon bantuan dari tim ${currentLegalName}. Terima kasih!`;
    window.open(`https://wa.me/${waClean}?text=${text}`, '_blank');
    setShowCsModal(false);
    setCsMessage('');
    setCsName('');
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand & Mission */}
        <div className="space-y-4">
          <Logo inverse={true} companyName={currentCompanyName} logoUrl={logoUrl || companySettings?.logoUrl} tagline={companySettings?.tagline} />
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            {currentCompanyName} di bawah naungan <strong>{currentLegalName}</strong> adalah provider internet terpercaya yang berkomitmen menyediakan 100% layanan Internet Fiber To The Home (FTTH). Menghubungkan Anda dengan kecepatan tinggi, stabil, dan tanpa batas kuota.
          </p>
          <div className="flex gap-3 text-slate-400 pt-2">
            <a
              href={fbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
              title="Facebook"
            >
              <span className="sr-only">Facebook</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
            </a>
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-800 hover:bg-pink-600 hover:text-white rounded-lg transition-all"
              title="Instagram"
            >
              <span className="sr-only">Instagram</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-800 hover:bg-red-600 hover:text-white rounded-lg transition-all"
              title="YouTube"
            >
              <span className="sr-only">YouTube</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a
              href={`https://wa.me/${waClean}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-800 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
              title="Chat WhatsApp"
            >
              <span className="sr-only">WhatsApp</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.451L0 24zm6.59-4.846c1.6.95 3.18 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.742.002-2.602-1.01-5.05-2.85-6.89C16.643 2.128 14.197.971 11.6.971c-5.444 0-9.87 4.373-9.874 9.746-.001 1.83.5 3.609 1.45 5.176L2.155 21.8l6.092-1.597z"/></svg>
            </a>
          </div>
        </div>

        {/* Navigation Links */}
        <div>
          <h4 className="font-semibold text-white text-sm tracking-wide uppercase mb-4">Navigasi</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <button
                onClick={() => {
                  onNavigate('home');
                  setTimeout(() => document.getElementById('promo-section')?.scrollIntoView({ behavior: 'smooth' }), 150);
                }}
                className="hover:text-blue-500 hover:underline transition-colors text-slate-400"
              >
                Promosi
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onNavigate('home');
                  setTimeout(() => document.getElementById('tentang-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="hover:text-blue-500 hover:underline transition-colors text-slate-400"
              >
                Tentang Kami
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onNavigate('home');
                  setTimeout(() => document.getElementById('cakupan-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="hover:text-blue-500 hover:underline transition-colors text-slate-400"
              >
                Area Cakupan
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onNavigate('home');
                  setTimeout(() => document.getElementById('paket-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="hover:text-blue-500 hover:underline transition-colors text-slate-400"
              >
                Pilihan Paket Wifi
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onNavigate('home');
                  setTimeout(() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="hover:text-blue-500 hover:underline transition-colors text-slate-400"
              >
                Tanya Jawab (FAQ)
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('subscribe')}
                className="hover:text-blue-500 hover:underline transition-colors text-slate-400 font-semibold text-blue-400"
              >
                Formulir Berlangganan
              </button>
            </li>
          </ul>
        </div>

        {/* Operating Center & Office */}
        <div>
          <h4 className="font-semibold text-white text-sm tracking-wide uppercase mb-4">
            KANTOR & OPERATION CENTER
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {currentAddress}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-3.5">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{companySettings?.coverageText || 'Wilayah Layanan Aktif'}</span>
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="font-semibold text-white text-sm tracking-wide uppercase mb-4">Kontak Resmi</h4>
          <ul className="space-y-3 text-xs text-slate-400">
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{currentPhone}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{currentEmail}</span>
            </li>
            <li className="bg-slate-800 p-3 rounded-xl border border-slate-700/50 text-[11px] text-yellow-400 flex flex-col gap-1">
              <span className="font-semibold text-white">Butuh Bantuan Segera?</span>
              Hubungi CS kami melalui WhatsApp 24 jam untuk laporan kendala atau pasang baru.
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p>Copyright © 2026 {currentLegalName}. All Rights Reserved</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-blue-500">Kebijakan Privasi</a>
          <span>•</span>
          <a href="#" className="hover:text-blue-500">Syarat & Ketentuan</a>
        </div>
      </div>

      {/* Floating CS Button WhatsApp - User request: "hanya diam tidak bergerak" (No bounce, No ping) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowCsModal(true)}
          className="p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 group relative"
          title="Hubungi Customer Service via WhatsApp"
          id="cs-floating-btn"
        >
          <span className="absolute right-14 bg-slate-900 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg shadow border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            Hubungi Customer Service {currentCompanyName} 24 Jam
          </span>
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.451L0 24zm6.59-4.846c1.6.95 3.18 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.742.002-2.602-1.01-5.05-2.85-6.89C16.643 2.128 14.197.971 11.6.971c-5.444 0-9.87 4.373-9.874 9.746-.001 1.83.5 3.609 1.45 5.176L2.155 21.8l6.092-1.597z" />
          </svg>
        </button>
      </div>

      {/* Customer Service Live Chat Form Modal */}
      {showCsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg text-white">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Customer Service {currentCompanyName.toUpperCase()}</h3>
                  <p className="text-[10px] text-emerald-100">Bantuan Langsung WhatsApp 24/7 &bull; {currentLegalName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCsModal(false)}
                className="p-1 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendSupport} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="cs-name">Nama Lengkap</label>
                <input
                  type="text"
                  id="cs-name"
                  value={csName}
                  onChange={(e) => setCsName(e.target.value)}
                  placeholder="Masukkan nama Anda..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="cs-msg">Pesan / Kendala</label>
                <textarea
                  id="cs-msg"
                  rows={3}
                  value={csMessage}
                  onChange={(e) => setCsMessage(e.target.value)}
                  placeholder="Ceritakan pertanyaan atau keluhan Anda..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 text-xs"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">Nomor WhatsApp CS:</p>
                <p className="font-mono text-emerald-600 font-bold">{currentPhone}</p>
                <p className="text-[10px] text-slate-400">Pesan akan diteruskan ke aplikasi WhatsApp Anda.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Send className="w-4 h-4" />
                <span>Kirim via WhatsApp Sekarang</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </footer>
  );
}
