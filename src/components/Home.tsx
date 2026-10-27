import React, { useState, useEffect } from 'react';
import { Wifi, Shield, Zap, Check, ArrowRight, HelpCircle, MapPin, Sparkles, AlertCircle, Gift, Tag } from 'lucide-react';
import { WifiPackage, CompanySettings } from '../types';
import CoverageDetails from './CoverageDetails';
import Testimonials from './Testimonials';
import Logo from './Logo';

interface HomeProps {
  onSelectPackage: (packageId: string) => void;
  onNavigate: (page: string) => void;
  companyName?: string;
  logoUrl?: string;
  companySettings?: CompanySettings;
}

// Packages definitions matching Image 1 and Image 2
export const PACKAGES: WifiPackage[] = [
  // Home Packages (difusi/patas.net)
  {
    id: 'home-10m',
    name: 'Home Basic 10 Mbps',
    speed: '10 Mbps',
    price: 120000,
    features: ['Kecepatan Stabil up to 10 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 1-3 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home'
  },
  {
    id: 'home-15m',
    name: 'Home Starter 15 Mbps',
    speed: '15 Mbps',
    price: 160000,
    features: ['Kecepatan Stabil up to 15 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 3-5 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home'
  },
  {
    id: 'home-20m',
    name: 'Home Lite 20 Mbps',
    speed: '20 Mbps',
    price: 170000,
    features: ['Kecepatan Stabil up to 20 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 4-6 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: true
  },
  {
    id: 'home-30m',
    name: 'Home Family 30 Mbps',
    speed: '30 Mbps',
    price: 210000,
    features: ['Kecepatan Stabil up to 30 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 6-8 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home'
  },
  {
    id: 'home-50m',
    name: 'Home Pro 50 Mbps',
    speed: '50 Mbps',
    price: 270000,
    features: ['Kecepatan Stabil up to 50 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 8-10 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home'
  },
  {
    id: 'home-100m',
    name: 'Home Ultra 100 Mbps',
    speed: '100 Mbps',
    price: 490000,
    features: ['Kecepatan Stabil up to 100 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 10-15 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home'
  },

  // Premium / Business Packages (Patas Net Area)
  {
    id: 'patasnet-prime',
    name: 'Patas Net PRIME 50 Mbps',
    speed: 'Up to 50 Mbps',
    price: 220000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support CCTV Online Rumah', 'Streaming Smart TV 4K', 'GRATIS Biaya Pasang'],
    type: 'business'
  },
  {
    id: 'patasnet-exclusive',
    name: 'Patas Net EXCLUSIVE 100 Mbps',
    speed: 'Up to 100 Mbps',
    price: 275000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 2 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: true
  },
  {
    id: 'patasnet-exclusive2',
    name: 'Patas Net EXCLUSIVE II 200 Mbps',
    speed: 'Up to 200 Mbps',
    price: 310000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 3 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang'],
    type: 'business'
  },
  {
    id: 'patasnet-bisnis',
    name: 'Patas Net BISNIS 300 Mbps',
    speed: 'Up to 300 Mbps',
    price: 375000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 5+ CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Super Stabil', 'GRATIS Biaya Pasang'],
    type: 'business'
  }
];

export default function Home({ onSelectPackage, onNavigate, companyName, logoUrl, companySettings }: HomeProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'business'>('home');
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [packagesList, setPackagesList] = useState<WifiPackage[]>(PACKAGES);
  const [promosList, setPromosList] = useState<string[]>(companySettings?.promos || []);

  const currentCompanyName = companyName || companySettings?.name || 'Patas Net WiFi';
  const currentLegalName = companySettings?.legalName || 'PT. AMANUSA TELEMEDIA';
  const currentTagline = companySettings?.tagline || 'Internet tanpa batas kuota ini siap membawa Anda ke era digital yang lebih cepat dan efisien. Nikmati koneksi 100% fiber optik simetris.';
  const currentCoverageText = companySettings?.coverageText || '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan';

  // Dynamic coverage parser matching top navbar
  const parseCoverageStats = (text?: string) => {
    const defaultStats = { cities: '5', districts: '13', subdistricts: '40' };
    if (!text) return defaultStats;
    const parts = text.split(',');
    const cMatch = parts[0]?.match(/\d+/);
    const dMatch = parts[1]?.match(/\d+/);
    const sMatch = parts[2]?.match(/\d+/);
    return {
      cities: cMatch ? cMatch[0] : '5',
      districts: dMatch ? dMatch[0] : '13',
      subdistricts: sMatch ? sMatch[0] : '40',
    };
  };
  const coverageStats = parseCoverageStats(companySettings?.coverageText);
  const [coverageData, setCoverageData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/packages')
      .then(res => res.json())
      .then(data => {
        if (data.packages && data.packages.length > 0) {
          setPackagesList(data.packages);
        }
      })
      .catch(() => {});

    fetch('/api/settings/company')
      .then(res => res.json())
      .then(data => {
        if (data.promos && data.promos.length > 0) {
          setPromosList(data.promos);
        }
      })
      .catch(() => {});

    fetch('/api/coverage')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCoverageData(data);
        }
      })
      .catch(() => {});
  }, []);

  // Compute live coverage numbers from database or fallback to settings
  const liveCitiesCount = coverageData.length > 0 ? coverageData.length : parseInt(coverageStats.cities) || 5;
  const liveDistrictsCount = coverageData.length > 0
    ? coverageData.reduce((acc, c) => acc + (c.kecamatans?.length || 0), 0)
    : parseInt(coverageStats.districts) || 13;
  const liveSubdistrictsCount = coverageData.length > 0
    ? coverageData.reduce((acc, c) => acc + (c.kecamatans?.reduce((kAcc: number, k: any) => kAcc + (k.kelurahans?.length || 0), 0) || 0), 0)
    : parseInt(coverageStats.subdistricts) || 40;

  const preciseCoverageText = `${liveCitiesCount} Kota/Kabupaten, ${liveDistrictsCount} Kecamatan, ${liveSubdistrictsCount} Kelurahan`;

  // Form states
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingContact, setSendingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim() || !contactMessage.trim()) return;

    setSendingContact(true);
    setContactError('');
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: contactName,
          email: contactEmail,
          phone: contactPhone,
          message: contactMessage,
        })
      });

      if (response.ok) {
        setContactSuccess(true);
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setContactMessage('');
      } else {
        setContactError('Gagal mengirim pesan. Silakan coba lagi nanti.');
      }
    } catch (err) {
      console.error(err);
      setContactError('Terjadi kesalahan koneksi.');
    } finally {
      setSendingContact(false);
    }
  };

  const filteredPackages = packagesList.filter((p) => p.type === activeTab);

  const faqs = [
    {
      q: 'Apa yang dimaksud dengan Patas Net?',
      a: 'Patas Net adalah provider internet berkualitas yang menyediakan layanan 100% Internet Fiber To The Home (FTTH). Layanan Patas Net memberikan Anda kecepatan internet cepat dan stabil untuk menyelesaikan segala tugas Anda, streaming video berkualitas HD/4K, maupun gaming tanpa hambatan.'
    },
    {
      q: 'Apa keuntungan menggunakan layanan Patas Net?',
      a: 'Patas Net menawarkan internet unlimited tanpa kuota dengan kecepatan simetris antara upload dan download (1:1), gratis biaya pemasangan di area tertentu, harga terjangkau yang sudah termasuk pajak, serta jaminan layanan bantuan gangguan 24 jam.'
    },
    {
      q: 'Bagaimana cara berlangganan paket dari Patas Net?',
      a: 'Anda cukup klik tombol "Berlangganan" di menu navigasi, pilih paket yang sesuai kebutuhan Anda, lengkapi formulir pendaftaran, tentukan titik lokasi pemasangan pada peta OpenStreetMap Leaflet yang kami sediakan, dan unggah foto KTP. Tim teknisi kami akan segera melakukan verifikasi dan penjadwalan pasang baru.'
    },
    {
      q: 'Apa yang dimaksud dengan teknologi Speedify?',
      a: 'Teknologi Speedify yang kami gunakan menggabungkan optimasi jalur koneksi cerdas untuk meminimalkan latensi dan memaksimalkan kestabilan ping saat bermain game online atau melakukan panggilan video konferensi.'
    },
    {
      q: 'Apakah Patas Net menerapkan FUP (Fair Usage Policy)?',
      a: 'Tidak. Patas Net berkomitmen memberikan layanan True Unlimited tanpa FUP, sehingga Anda dapat menikmati kecepatan internet penuh sepanjang bulan tanpa penurunan kecepatan setelah mencapai batas pemakaian tertentu.'
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white py-20 sm:py-28 px-4">
        {/* Abstract background blobs */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold tracking-wide uppercase border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" /> INTERNET CEPAT BERKUALITAS 100% FIBER OPTIK
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Internet <span className="text-blue-400">Stabil dan Cepat</span>, Koneksi Wifi Rumah <span className="text-yellow-400">Unlimited</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {currentTagline} Nikmati koneksi internet rumah dan bisnis tanpa batas kuota dengan 100% fiber optik simetris, ping stabil, dan instalasi terpercaya.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={() => {
                  document.getElementById('paket-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-sm"
              >
                Lihat Paket
              </button>
              <button
                onClick={() => {
                  document.getElementById('promo-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700 rounded-xl font-semibold transition-all active:scale-95 text-sm"
              >
                Cek Promo Terbaru
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            {/* Visual placeholder card representing Image 1 (Taranet Girl holding laptop) */}
            <div className="relative w-full max-w-sm aspect-square glass-panel-dark rounded-3xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-950/40 via-transparent to-transparent pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1 px-3 py-1 bg-yellow-400 text-slate-900 font-extrabold text-[10px] rounded-lg tracking-wider uppercase">
                  PROMO MEI-JULI
                </div>
                <div className="text-right text-xs font-semibold text-slate-300">
                  {currentLegalName}
                </div>
              </div>

              {/* Graphic element representing high-speed data flow */}
              <div className="my-auto space-y-5 text-center">
                <div className="mx-auto flex justify-center">
                  <Logo iconOnly={true} className="scale-125" companyName={currentCompanyName} logoUrl={logoUrl || companySettings?.logoUrl} />
                </div>
                <div>
                  <h3 className="font-display font-black text-2xl text-white">UP TO 300 Mbps</h3>
                  <p className="text-xs text-slate-300">100% Simetris Upload & Download</p>
                </div>
                {/* Visual speed wave */}
                <div className="flex justify-center gap-1.5 h-6 items-end">
                  <div className="w-1.5 h-2 bg-blue-500 rounded-full" />
                  <div className="w-1.5 h-3 bg-blue-400 rounded-full animate-pulse" />
                  <div className="w-1.5 h-4 bg-blue-300 rounded-full" />
                  <div className="w-1.5 h-5 bg-blue-200 rounded-full animate-bounce" />
                  <div className="w-1.5 h-6 bg-yellow-400 rounded-full" />
                </div>
              </div>

              <div className="bg-slate-950/80 backdrop-blur border border-white/10 p-3.5 rounded-xl text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Biaya Pemasangan Baru</p>
                <p className="font-extrabold text-lg text-emerald-400">RP 0 (GRATIS 100%)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Special Section */}
      <section id="promo-section" className="py-16 px-4 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Admin Uploaded Promo Banners Carousel/Grid if available */}
          {promosList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] bg-red-600 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    PROMO TERBATAS
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    Event Promo & Penawaran Spesial Terbaru
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('subscribe')}
                  className="hidden sm:inline-flex text-xs text-blue-600 font-bold hover:underline"
                >
                  Klaim Promo Ini &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {promosList.map((promoUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigate('subscribe')}
                    className="group relative rounded-3xl overflow-hidden shadow-lg border border-slate-200 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                  >
                    <img
                      src={promoUrl}
                      alt={`Promo Spesial ${idx + 1}`}
                      className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                      <span className="bg-yellow-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider w-fit">
                        Promo Eksklusif
                      </span>
                      <p className="font-extrabold text-sm mt-1 text-white">Klik untuk Klaim Promo Sekarang &rarr;</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
            {/* Abstract circle lines */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-12 translate-x-12" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4">
                <span className="inline-block px-3 py-1 bg-yellow-400 text-slate-900 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
                  Dapatkan Promo Terbaik
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Bayar Berlangganan Di Awal, Gratis Bulan Layanan!
                </h2>
                <p className="text-sm text-blue-100 leading-relaxed max-w-2xl">
                  Tingkatkan koneksi Anda dan dapatkan ekstra hemat biaya berlangganan dengan program pembayaran di awal kami. Promo ini berlaku untuk semua wilayah cakupan dan seluruh jenis paket internet.
                </p>

                {/* Promo plans grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/15">
                    <p className="text-xs text-yellow-300 font-bold uppercase">PROMO HEMAT 3</p>
                    <p className="text-lg font-black mt-1">Bayar 3 Bulan</p>
                    <p className="text-xs text-blue-200 mt-1">Gratis Layanan 1 Bulan</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/15">
                    <p className="text-xs text-yellow-300 font-bold uppercase">PROMO HEMAT 5</p>
                    <p className="text-lg font-black mt-1">Bayar 5 Bulan</p>
                    <p className="text-xs text-blue-200 mt-1">Gratis Layanan 2 Bulan</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/15">
                    <p className="text-xs text-yellow-300 font-bold uppercase">PROMO HEMAT 9</p>
                    <p className="text-lg font-black mt-1">Bayar 9 Bulan</p>
                    <p className="text-xs text-blue-200 mt-1">Gratis Layanan 3 Bulan</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white text-slate-900 p-6 rounded-2xl border border-blue-500/10 shadow-lg flex flex-col justify-between text-center lg:text-left">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Kabar Gembira!</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 mt-1">Gratis Biaya Pemasangan!</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2">
                    Cukup bayar paket bulan pertama saja, instalasi kabel drop core fiber optic dan modem ONT Router WiFi baru akan disiapkan teknisi secara GRATIS tanpa pungutan biaya tambahan.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('subscribe')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold mt-6 text-sm transition-all shadow-md shadow-blue-600/20 active:scale-95"
                >
                  Daftar Langganan Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Package Selection Section */}
      <section id="paket-section" className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
          <span className="text-xs text-blue-600 font-bold uppercase tracking-widest">PRODUK AREA KAMI</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Pilihan Paket Internet Sesuai Kebutuhan Anda</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Kami menawarkan variasi kecepatan internet cepat tanpa batasan kuota untuk keperluan belajar anak, keluarga besar di rumah, hingga bisnis kantor dan kafe Anda.
          </p>

          {/* Toggle Tab */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 mt-4">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'home' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-blue-600'}`}
            >
              Paket Rumah (Sederhana & Murah)
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'business' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-blue-600'}`}
            >
              Paket Premium / Bisnis (Up to 300 Mbps)
            </button>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white rounded-2xl border transition-all duration-300 relative flex flex-col justify-between ${pkg.popular ? 'border-blue-500 shadow-xl scale-[1.02]' : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase px-3.5 py-1 rounded-full border-2 border-white shadow-md tracking-wider">
                  PILIHAN UTAMA / TERPOPULER
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">{pkg.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">Kecepatan Unlimited True Fiber Optic</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Bandwidth</span>
                    <span className="font-black text-2xl text-blue-600 font-mono">{pkg.speed}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Harga</span>
                    <span className="font-black text-xl text-slate-900">
                      Rp {pkg.price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-bold">/ bulan (Net)</span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-100 rounded-b-2xl">
                <button
                  onClick={() => onSelectPackage(pkg.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${pkg.popular ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10' : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'}`}
                >
                  Langganan Sekarang
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {activeTab === 'home' && (
          <p className="text-center text-xs text-slate-400 font-bold mt-10">
            *Biaya Sewa STB Android Box untuk TV Kabel hanya Rp 25.000 / Bulan (Opsional pada pendaftaran)
          </p>
        )}
      </section>

      {/* Keunggulan Section */}
      <section id="tentang-section" className="py-20 px-4 bg-slate-100/60 border-t border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs text-blue-600 font-bold uppercase tracking-widest">KUALITAS TERBAIK PATAS NET</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              100% Internet Fiber Optik Berkecepatan Simetris
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Layanan Patas Net memberikan internet cepat dan stabil dengan upload dan download simetris untuk pengalaman wifi rumah unlimited yang sesungguhnya. Kami memastikan internet Anda tanpa batasan kuota sepanjang waktu.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600 shrink-0 h-fit">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Broadband Cepat</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">Layanan internet Fiber To The Home (FTTH) murni langsung ke rumah Anda.</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex gap-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 shrink-0 h-fit">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Aman & Terenkripsi</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">Kami menerapkan sistem enkripsi data tingkat tinggi untuk privasi pengguna.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900 text-white p-8 sm:p-10 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-44 h-44 bg-white/5 rounded-full translate-y-12 translate-x-12" />
            <h3 className="text-2xl font-black tracking-tight">Kelebihan Utama Patas Net</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="p-1 bg-yellow-400 text-slate-900 rounded-full shrink-0">
                  <Check className="w-3.5 h-3.5 font-bold" />
                </div>
                <div>
                  <p className="font-bold text-sm">Upload & Download Simetris</p>
                  <p className="text-xs text-blue-200">Kecepatan unggah berkas sama cepatnya dengan unduh, ideal untuk konten kreator.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1 bg-yellow-400 text-slate-900 rounded-full shrink-0">
                  <Check className="w-3.5 h-3.5 font-bold" />
                </div>
                <div>
                  <p className="font-bold text-sm">Tanpa Batas Kuota (FUP)</p>
                  <p className="text-xs text-blue-200">Bebas download berkas besar sepuasnya tanpa takut penurunan kecepatan.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1 bg-yellow-400 text-slate-900 rounded-full shrink-0">
                  <Check className="w-3.5 h-3.5 font-bold" />
                </div>
                <div>
                  <p className="font-bold text-sm">Dukungan Gangguan 24 Jam</p>
                  <p className="text-xs text-blue-200">Hubungi customer service kami jika ada kendala, teknisi siap terjun.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Area Cakupan Section */}
      <section id="cakupan-section" className="py-20 px-4 max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200/80 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">{preciseCoverageText}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">Cakupan Wilayah {currentCompanyName}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Kami terus memperluas jaringan jalur serat optik kami ({preciseCoverageText}) untuk memastikan setiap warga dapat menikmati jaringan internet cepat berkualitas tinggi tanpa hambatan.
            </p>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-xs text-blue-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Belum tercover? Daftarkan alamat Anda terlebih dahulu pada formulir untuk prioritas penarikan jaringan baru!</p>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/70 backdrop-blur p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-blue-600 font-mono">{liveCitiesCount}</p>
              <p className="font-bold text-[11px] sm:text-xs text-slate-900 leading-tight">Kota / Kabupaten</p>
              <p className="text-[10px] text-slate-400">Aktif Terlayani</p>
            </div>
            <div className="bg-white/70 backdrop-blur p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-blue-600 font-mono">{liveDistrictsCount}</p>
              <p className="font-bold text-[11px] sm:text-xs text-slate-900 leading-tight">Kecamatan</p>
              <p className="text-[10px] text-slate-400">Jalur Terkoneksi</p>
            </div>
            <div className="bg-white/70 backdrop-blur p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-blue-600 font-mono">{liveSubdistrictsCount}</p>
              <p className="font-bold text-[11px] sm:text-xs text-slate-900 leading-tight">Kelurahan</p>
              <p className="text-[10px] text-slate-400">Titik Distribusi ODN</p>
            </div>
          </div>
        </div>

        {/* Detailed Interactive Coverage List */}
        <div className="pt-4">
          <div className="text-center md:text-left mb-6 space-y-2">
            <h3 className="font-display font-bold text-lg text-slate-800 flex items-center justify-center md:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Pencarian Titik Distribusi Serat Optik Aktif (Real-time)
            </h3>
            <p className="text-xs text-slate-500">
              Silakan klik tombol wilayah di bawah untuk memeriksa ketersediaan tiang feed-node dan kelurahan Anda:
            </p>
          </div>
          <CoverageDetails />
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <section id="testimonials-section" className="py-20 px-4 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200/40">
        <div className="max-w-7xl mx-auto space-y-8 text-center">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="text-xs text-blue-600 font-bold uppercase tracking-widest">TESTIMONI PELANGGAN</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">Dipercaya oleh Ribuan Keluarga & Profesional</h2>
            <p className="text-sm text-slate-500">
              Dengarkan langsung umpan balik jujur dari para pengguna Patas Net yang telah menikmati internet tanpa FUP dengan kestabilan penuh di berbagai kota.
            </p>
          </div>
          <Testimonials />
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq-section" className="py-20 px-4 bg-slate-100/60 border-t border-b border-slate-200/40">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs text-blue-600 font-bold uppercase tracking-widest">TANYA JAWAB</span>
            <h2 className="text-3xl font-extrabold tracking-tight">Pertanyaan yang Sering Diajukan</h2>
            <p className="text-sm text-slate-500">Temukan jawaban cepat atas pertanyaan mendasar mengenai layanan Patas Net Wifi.</p>
          </div>

          <div className="space-y-4 pt-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm transition-all">
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full px-6 py-4.5 text-left font-bold text-sm sm:text-base flex justify-between items-center text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                    {faq.q}
                  </span>
                  <span className="text-blue-600 text-lg shrink-0 ml-4 font-mono font-bold">
                    {faqOpen === idx ? '−' : '+'}
                  </span>
                </button>
                {faqOpen === idx && (
                  <div className="px-6 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us Form */}
      <section id="contact-section" className="py-20 px-4 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden">
          <div className="md:col-span-5 bg-gradient-to-br from-blue-900 to-indigo-950 p-8 text-white flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-extrabold px-3 py-1 rounded-full uppercase border border-blue-500/30">Hubungi Kami</span>
              <h3 className="text-2xl font-black leading-tight">Mulai konsultasi pemasangan baru</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tim teknis & sales kami siap membantu pengecekan ketersediaan jaringan di lokasi rumah Anda dan merekomendasikan pilihan paket terbaik.
              </p>
            </div>

            <div className="space-y-4 pt-8 border-t border-white/10 text-xs">
              <div className="flex gap-3">
                <MapPin className="w-4 h-4 text-yellow-400 shrink-0" />
                <p>{companySettings?.address || 'Jakarta Selatan, Indonesia'}</p>
              </div>
              <div className="flex gap-3">
                <Wifi className="w-4 h-4 text-yellow-400 shrink-0" />
                <p>{companySettings?.email || 'cs@patasnet.id'}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 p-8">
            <h3 className="font-extrabold text-lg text-slate-900 mb-6">Kirim Pesan Penyelidikan</h3>

            {contactSuccess ? (
              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                <h4 className="font-bold text-emerald-900 text-sm">Pesan Berhasil Terkirim!</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Terima kasih sudah menghubungi kami. Tim sales kami akan segera memproses informasi Anda dalam waktu maks. 1x24 jam kerja.
                </p>
                <button
                  onClick={() => setContactSuccess(false)}
                  className="px-4 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-all"
                >
                  Kirim Pesan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="contact-name">NAMA ANDA *</label>
                  <input
                    type="text"
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Masukkan nama lengkap..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1" htmlFor="contact-email">ALAMAT EMAIL *</label>
                    <input
                      type="email"
                      id="contact-email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1" htmlFor="contact-phone">NOMOR HANDPHONE *</label>
                    <input
                      type="tel"
                      id="contact-phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="contact-message">PESAN ANDA *</label>
                  <textarea
                    id="contact-message"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Tuliskan pertanyaan atau alamat lengkap untuk pengecekan jaringan..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none h-24 resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  id="contact-submit-btn"
                  disabled={sendingContact}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow transition-all active:scale-95 disabled:bg-slate-400"
                >
                  {sendingContact ? 'Mengirim...' : 'Kirim Pesan'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
