import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, ShieldCheck } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  location: string;
  avatarUrl: string;
  rating: number;
  text: string;
  tag: string;
}

const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 1,
    name: 'Rahmat Hidayat',
    role: 'Gamers Profesional & Streamer',
    location: 'Kebayoran Baru, Jakarta Selatan',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
    rating: 5,
    text: 'Sebagai gamers dan streamer Twitch, latensi dan kestabilan ping adalah segalanya. Setelah beralih ke Patas Net Exclusive 100 Mbps, ping ke server Valorant stabil di 8ms tanpa jitter! Dan yang paling penting: tidak ada FUP sama sekali. Bebas stream seharian penuh.',
    tag: 'STABILITAS GAMING'
  },
  {
    id: 2,
    name: 'Siti Aminah',
    role: 'Ibu Rumah Tangga (6 Perangkat Aktif)',
    location: 'Ciomas, Kabupaten Bogor',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80',
    rating: 5,
    text: 'Anak-anak sekolah online, suami WFH, saya sendiri suka nonton drama Korea di Smart TV 4K. Hebatnya, paket Patas Net Home 20 Mbps sanggup melayani semua tanpa buffering sedikit pun! Biayanya sangat ramah di kantong dan penanganan CS cepat sekali.',
    tag: 'KELUARGA HEMAT'
  },
  {
    id: 3,
    name: 'Kevin Sanjaya',
    role: 'Software Engineer & Remote Worker',
    location: 'Serpong, Tangerang Selatan',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
    rating: 5,
    text: 'Sering melakukan deploy file besar ke AWS dan meeting Zoom dengan klien luar negeri. Patas Net memberikan kecepatan simetris 1:1, upload secepat downloadnya. Koneksi tidak pernah drop meskipun cuaca hujan lebat di luar rumah. Sangat profesional!',
    tag: 'PRODUKTIVITAS KERJA'
  },
  {
    id: 4,
    name: 'Lidya Natalia',
    role: 'Pemilik Kafe "Serene Beans"',
    location: 'Bogor Timur, Kota Bogor',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    rating: 5,
    text: 'Kami sewa STB Android dan pasang Patas Net Premium untuk pengunjung kafe. Hasilnya pelanggan makin betah karena wifi kencang gratis. Support admin sangat kooperatif, laporan billing terbit otomatis dan pembayarannya mudah banget pakai QRIS.',
    tag: 'BISNIS & KAFE'
  }
];

export default function Testimonials() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  // Auto scroll effect
  useEffect(() => {
    if (!isAutoplay) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % TESTIMONIALS_DATA.length);
    }, 6000); // changes every 6s

    return () => clearInterval(interval);
  }, [isAutoplay]);

  const handlePrev = () => {
    setIsAutoplay(false);
    setCurrentIdx((prev) => (prev - 1 + TESTIMONIALS_DATA.length) % TESTIMONIALS_DATA.length);
  };

  const handleNext = () => {
    setIsAutoplay(false);
    setCurrentIdx((prev) => (prev + 1) % TESTIMONIALS_DATA.length);
  };

  const current = TESTIMONIALS_DATA[currentIdx];

  return (
    <div className="w-full relative py-8">
      {/* Background decoration elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-blue-500/5 rounded-full blur-3xl -z-10" />

      {/* Main Glassmorphic Testimonial Box */}
      <div className="max-w-4xl mx-auto glass-panel rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-6 right-8 text-blue-200">
          <Quote className="w-24 h-24 rotate-180 opacity-20" />
        </div>

        <div className="p-8 sm:p-10 md:p-12 space-y-6 sm:space-y-8 relative z-10">
          {/* Tag & Stars Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <span className="inline-block px-3 py-1 bg-blue-600/10 text-blue-700 font-bold text-[10px] sm:text-xs rounded-full uppercase tracking-wider">
              {current.tag}
            </span>
            <div className="flex items-center gap-1">
              {[...Array(current.rating)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-xs text-slate-500 font-bold font-mono ml-1">5.0 / 5.0</span>
            </div>
          </div>

          {/* Testimonial Quote Text with large clean typography */}
          <blockquote className="text-sm sm:text-base md:text-lg text-slate-700 font-medium leading-relaxed italic">
            "{current.text}"
          </blockquote>

          {/* User profile row */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-150/80">
            <div className="flex items-center gap-3.5">
              <img
                src={current.avatarUrl}
                alt={current.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-md shrink-0"
              />
              <div>
                <p className="font-display font-black text-sm text-slate-900">{current.name}</p>
                <p className="text-[11px] text-slate-500 font-semibold">{current.role}</p>
                <p className="text-[10px] text-blue-600 font-bold">{current.location}</p>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="p-2 bg-white/90 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-90"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-2 bg-white/90 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-90"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Dot Indicators */}
      <div className="flex justify-center gap-2 mt-5">
        {TESTIMONIALS_DATA.map((t, idx) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setIsAutoplay(false);
              setCurrentIdx(idx);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              currentIdx === idx ? 'w-6 bg-blue-600 shadow-sm shadow-blue-500/20' : 'w-2 bg-slate-300 hover:bg-slate-400'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
