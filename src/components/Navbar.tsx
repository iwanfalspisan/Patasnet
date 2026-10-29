import React, { useState, useEffect } from 'react';
import { Wifi, LogIn, User, LayoutDashboard, LogOut, PhoneCall, Menu, X, Home, Zap, MapPin, PlusCircle } from 'lucide-react';
import { CustomerUser, CompanySettings } from '../types';
import Logo from './Logo';
import PWAInstallButton from './PWAInstallButton';

interface NavbarProps {
  currentUser: CustomerUser | { isAdmin: boolean } | null;
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
  const [activeSection, setActiveSection] = useState<string>('home');

  const isAdmin = currentUser && 'isAdmin' in currentUser && (currentUser as any).isAdmin;
  const isCustomer = currentUser && !('isAdmin' in currentUser);
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
    setActiveSection(sectionId);
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

  const showPublicBottomNav =
    currentPage !== 'customer-dashboard' && currentPage !== 'admin-dashboard';

  return (
    <>
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
              onClick={() => {
                setActiveSection('home');
                onNavigate('home');
              }}
              className="cursor-pointer text-left focus:outline-none flex items-center transition active:scale-95"
            >
              <Logo companyName={currentCompanyName} logoUrl={currentLogoUrl} tagline={companySettings?.tagline} />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-2 text-sm font-semibold text-slate-600">
              <button
                onClick={() => scrollToSection('promo-section')}
                className={`px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 active:scale-95 ${
                  currentPage === 'home' ? 'text-blue-600 font-bold' : ''
                }`}
              >
                Promosi
              </button>
              <button
                onClick={() => scrollToSection('tentang-section')}
                className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 active:scale-95"
              >
                Tentang
              </button>
              <button
                onClick={() => scrollToSection('cakupan-section')}
                className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 active:scale-95"
              >
                Area Cakupan
              </button>
              <button
                onClick={() => scrollToSection('paket-section')}
                className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 active:scale-95"
              >
                Produk
              </button>
              <button
                onClick={() => scrollToSection('faq-section')}
                className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 active:scale-95"
              >
                FAQ
              </button>
              <button
                onClick={() => scrollToSection('contact-section')}
                className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 active:scale-95"
              >
                Hubungi Kami
              </button>
            </nav>

            {/* Right Action buttons (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <PWAInstallButton companyName={currentCompanyName} />
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isAdmin) onNavigate('admin-dashboard');
                      else onNavigate('customer-dashboard');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all border border-blue-100 active:scale-95"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    {isAdmin ? 'Dashboard Admin' : `Hi, ${customerUser?.name.split(' ')[0]}`}
                  </button>
                  <button
                    onClick={onLogout}
                    className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-600 transition-all border border-slate-200 active:scale-95"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('login-selection')}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-xs transition-all duration-200 active:scale-95"
                  >
                    <LogIn className="w-4 h-4 text-blue-600" />
                    Masuk
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

            {/* Mobile Top Right Actions */}
            <div className="flex items-center md:hidden gap-1.5">
              <PWAInstallButton companyName={currentCompanyName} compact />
              {currentUser && (
                <button
                  onClick={() => {
                    if (isAdmin) onNavigate('admin-dashboard');
                    else onNavigate('customer-dashboard');
                  }}
                  className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-100 flex items-center gap-1 active:scale-95"
                >
                  <LayoutDashboard className="w-3 h-3" />
                  <span>Panel</span>
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition active:scale-95"
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
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition active:scale-95"
              >
                🎁 Promosi Spesial
              </button>
              <button
                onClick={() => scrollToSection('paket-section')}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition active:scale-95"
              >
                ⚡ Pilihan Paket
              </button>
              <button
                onClick={() => scrollToSection('cakupan-section')}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition active:scale-95"
              >
                📍 Area Cakupan
              </button>
              <button
                onClick={() => scrollToSection('tentang-section')}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition active:scale-95"
              >
                🏢 Tentang Kami
              </button>
              <button
                onClick={() => scrollToSection('faq-section')}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition active:scale-95"
              >
                ❓ Tanya Jawab (FAQ)
              </button>
              <button
                onClick={() => scrollToSection('contact-section')}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left transition active:scale-95"
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
                      if (isAdmin) onNavigate('admin-dashboard');
                      else onNavigate('customer-dashboard');
                    }}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Buka Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-200 active:scale-95"
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
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95"
                  >
                    <LogIn className="w-4 h-4 text-blue-600" />
                    <span>Masuk</span>
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

      {/* ========================================================================= */}
      {/* NATIVE APP-STYLE MOBILE BOTTOM NAVIGATION BAR (PUBLIC PAGES)              */}
      {/* ========================================================================= */}
      {showPublicBottomNav && (
        <nav
          aria-label="Navigasi Bawah Mobile"
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-8px_25px_-5px_rgba(15,23,42,0.12)] px-2 py-1.5 flex items-center justify-around"
        >
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setActiveSection('home');
              onNavigate('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all active:scale-95 ${
              currentPage === 'home' && activeSection === 'home'
                ? 'text-blue-600 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Beranda</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('paket-section')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all active:scale-95 ${
              currentPage === 'home' && activeSection === 'paket-section'
                ? 'text-blue-600 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px]">Paket</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setActiveSection('subscribe');
              onNavigate('subscribe');
            }}
            className="flex flex-col items-center justify-center -mt-5 group active:scale-95 transition-transform"
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                currentPage === 'subscribe'
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-4 ring-white'
                  : 'bg-blue-600 text-white shadow-blue-600/30 ring-4 ring-white'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] mt-0.5 ${
                currentPage === 'subscribe' ? 'text-emerald-600 font-extrabold' : 'text-blue-600 font-extrabold'
              }`}
            >
              Daftar
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('cakupan-section')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all active:scale-95 ${
              currentPage === 'home' && activeSection === 'cakupan-section'
                ? 'text-blue-600 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-[10px]">Cakupan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              if (currentUser) {
                if (isAdmin) onNavigate('admin-dashboard');
                else onNavigate('customer-dashboard');
              } else {
                onNavigate('login-selection');
              }
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all active:scale-95 ${
              currentPage === 'login-selection'
                ? 'text-blue-600 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            {currentUser ? <LayoutDashboard className="w-5 h-5" /> : <User className="w-5 h-5" />}
            <span className="text-[10px]">{currentUser ? 'Panel' : 'Masuk'}</span>
          </button>
        </nav>
      )}
    </>
  );
}

