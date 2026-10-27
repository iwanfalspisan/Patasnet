import React, { useState, useEffect } from 'react';
import { Wifi, LogIn, User, LayoutDashboard, LogOut, PhoneCall, Menu, X, RotateCw } from 'lucide-react';
import { CustomerUser, CompanySettings } from '../types';
import Logo from './Logo';

interface NavbarProps {
  currentUser: CustomerUser | { isAdmin: boolean } | { isDeveloper: boolean } | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  companyName?: string;
  logoUrl?: string;
  companySettings?: CompanySettings;
}

export default function Navbar({
  currentUser,
  onLogout,
  onNavigate,
  currentPage,
  companyName,
  logoUrl,
  companySettings,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser && 'isAdmin' in currentUser && (currentUser as any).isAdmin;
  const isDeveloper = currentUser && 'isDeveloper' in currentUser && (currentUser as any).isDeveloper;
  const isCustomer = currentUser && !('isAdmin' in currentUser) && !('isDeveloper' in currentUser);
  const customerUser = isCustomer ? (currentUser as CustomerUser) : null;

  const currentCompanyName = companyName || companySettings?.name || 'Patas Net WiFi';
  const currentLogoUrl = logoUrl || companySettings?.logoUrl;
  const [liveCoverageText, setLiveCoverageText] = useState(companySettings?.coverageText || '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan');
  const contactPhone = companySettings?.phoneNumber || companySettings?.whatsappNumber || '+62 899-3299-977';

  useEffect(() => {
    if (companySettings?.coverageText) {
      setLiveCoverageText(companySettings.coverageText);
    }
  }, [companySettings?.coverageText]);

  useEffect(() => {
    fetch('/api/coverage')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const totalCities = data.length;
          const totalKec = data.reduce((acc: number, c: any) => acc + (c.kecamatans?.length || 0), 0);
          const totalKel = data.reduce((acc: number, c: any) => acc + (c.kecamatans?.reduce((kAcc: number, k: any) => kAcc + (k.kelurahans?.length || 0), 0) || 0), 0);
          setLiveCoverageText(`${totalCities} Kota/Kabupaten, ${totalKec} Kecamatan, ${totalKel} Kelurahan`);
        }
      })
      .catch(() => {});
  }, []);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (currentPage !== 'home') {
      onNavigate('home');
    }
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
      {/* Top Bar info (Area Cakupan & Layanan Konsumen dari Pengaturan Admin) */}
      <div className="bg-blue-900 text-white text-xs py-1.5 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1 font-medium text-center sm:text-left">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs tracking-tight">
            <span>AREA CAKUPAN: <strong className="text-yellow-400 font-bold">{liveCoverageText}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs">
            <span className="flex items-center gap-1.5">
              <PhoneCall className="w-3 h-3 text-yellow-400 shrink-0" />
              <span>LAYANAN KONSUMEN: <strong>{contactPhone}</strong></span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Header Brand */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="cursor-pointer text-left focus:outline-none flex items-center transition active:scale-95"
          >
            <Logo companyName={currentCompanyName} logoUrl={currentLogoUrl} tagline={companySettings?.tagline} />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-slate-600">
            <button
              onClick={() => scrollToSection('promo-section')}
              className={`hover:text-blue-600 transition-colors ${
                currentPage === 'home' ? 'text-blue-600 font-bold' : ''
              }`}
            >
              Promosi
            </button>
            <button
              onClick={() => scrollToSection('tentang-section')}
              className="hover:text-blue-600 transition-colors"
            >
              Tentang
            </button>
            <button
              onClick={() => scrollToSection('cakupan-section')}
              className="hover:text-blue-600 transition-colors"
            >
              Area Cakupan
            </button>
            <button
              onClick={() => scrollToSection('paket-section')}
              className="hover:text-blue-600 transition-colors"
            >
              Produk
            </button>
            <button
              onClick={() => scrollToSection('faq-section')}
              className="hover:text-blue-600 transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => scrollToSection('contact-section')}
              className="hover:text-blue-600 transition-colors"
            >
              Hubungi Kami
            </button>
          </nav>

          {/* Right Action buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isDeveloper) onNavigate('developer-dashboard');
                    else if (isAdmin) onNavigate('admin-dashboard');
                    else onNavigate('customer-dashboard');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all border border-blue-100"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {isDeveloper ? 'Control Tower Dev' : isAdmin ? 'Dashboard Admin' : `Hi, ${customerUser?.name.split(' ')[0]}`}
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-600 transition-all border border-slate-200"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('login-selection')}
                  className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-blue-600 font-bold text-xs transition-colors"
                >
                  <LogIn className="w-4 h-4 text-blue-600" />
                  Login
                </button>
                <button
                  onClick={() => onNavigate('subscribe')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10 active:scale-95"
                >
                  Berlangganan
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden gap-2">
            {currentUser && (
              <button
                onClick={() => {
                  if (isDeveloper) onNavigate('developer-dashboard');
                  else if (isAdmin) onNavigate('admin-dashboard');
                  else onNavigate('customer-dashboard');
                }}
                className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-100 flex items-center gap-1"
              >
                <LayoutDashboard className="w-3 h-3" />
                <span>Panel</span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/98 px-4 py-5 shadow-2xl animate-in slide-in-from-top duration-200 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
            <button
              onClick={() => scrollToSection('promo-section')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition"
            >
              🎁 Promosi Spesial
            </button>
            <button
              onClick={() => scrollToSection('paket-section')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition"
            >
              ⚡ Pilihan Paket
            </button>
            <button
              onClick={() => scrollToSection('cakupan-section')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition"
            >
              📍 Area Cakupan
            </button>
            <button
              onClick={() => scrollToSection('tentang-section')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition"
            >
              🏢 Tentang Kami
            </button>
            <button
              onClick={() => scrollToSection('faq-section')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition"
            >
              ❓ Tanya Jawab (FAQ)
            </button>
            <button
              onClick={() => scrollToSection('contact-section')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition"
            >
              📞 Hubungi CS
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (isDeveloper) onNavigate('developer-dashboard');
                    else if (isAdmin) onNavigate('admin-dashboard');
                    else onNavigate('customer-dashboard');
                  }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Buka Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-200"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('login-selection');
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-blue-600" />
                  <span>Login</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('subscribe');
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 text-center"
                >
                  Daftar Pasang WiFi Baru
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
