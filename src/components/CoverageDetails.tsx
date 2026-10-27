import React, { useState, useEffect } from 'react';
import { MapPin, Search, ChevronRight, ChevronDown, CheckCircle2, ShieldCheck, Building2, Globe } from 'lucide-react';

interface KelurahanInfo {
  name: string;
  status: 'active' | 'planning';
  nodesCount: number;
}

interface KecamatanInfo {
  name: string;
  kelurahans: KelurahanInfo[];
}

interface CityCoverage {
  cityName: string;
  regionType: 'Kota' | 'Kabupaten';
  totalKecamatan: number;
  totalKelurahan: number;
  kecamatans: KecamatanInfo[];
}

const REGIONAL_COVERAGE_DATA: CityCoverage[] = [
  {
    cityName: 'Jakarta Selatan',
    regionType: 'Kota',
    totalKecamatan: 4,
    totalKelurahan: 14,
    kecamatans: [
      {
        name: 'Kebayoran Baru',
        kelurahans: [
          { name: 'Rawa Barat', status: 'active', nodesCount: 12 },
          { name: 'Selong', status: 'active', nodesCount: 8 },
          { name: 'Melawai', status: 'active', nodesCount: 15 },
          { name: 'Kramat Pela', status: 'active', nodesCount: 11 },
          { name: 'Gunung', status: 'active', nodesCount: 9 }
        ]
      },
      {
        name: 'Cilandak',
        kelurahans: [
          { name: 'Cipete Selatan', status: 'active', nodesCount: 14 },
          { name: 'Gandaria Selatan', status: 'active', nodesCount: 16 },
          { name: 'Pondok Labu', status: 'active', nodesCount: 22 },
          { name: 'Lebak Bulus', status: 'active', nodesCount: 18 }
        ]
      },
      {
        name: 'Mampang Prapatan',
        kelurahans: [
          { name: 'Kuningan Barat', status: 'active', nodesCount: 25 },
          { name: 'Pela Mampang', status: 'active', nodesCount: 19 },
          { name: 'Bangka', status: 'active', nodesCount: 15 }
        ]
      },
      {
        name: 'Tebet',
        kelurahans: [
          { name: 'Menteng Dalam', status: 'active', nodesCount: 14 },
          { name: 'Tebet Barat', status: 'active', nodesCount: 17 }
        ]
      }
    ]
  },
  {
    cityName: 'Depok',
    regionType: 'Kota',
    totalKecamatan: 3,
    totalKelurahan: 9,
    kecamatans: [
      {
        name: 'Beji',
        kelurahans: [
          { name: 'Pondok Cina', status: 'active', nodesCount: 32 },
          { name: 'Beji Timur', status: 'active', nodesCount: 12 },
          { name: 'Kemiri Muka', status: 'active', nodesCount: 18 }
        ]
      },
      {
        name: 'Pancoran Mas',
        kelurahans: [
          { name: 'Depok Jaya', status: 'active', nodesCount: 14 },
          { name: 'Mampang', status: 'active', nodesCount: 10 },
          { name: 'Pancoran Mas', status: 'active', nodesCount: 16 }
        ]
      },
      {
        name: 'Cinere',
        kelurahans: [
          { name: 'Cinere', status: 'active', nodesCount: 20 },
          { name: 'Gandul', status: 'active', nodesCount: 15 },
          { name: 'Pangkalan Jati', status: 'active', nodesCount: 11 }
        ]
      }
    ]
  },
  {
    cityName: 'Tangerang Selatan',
    regionType: 'Kota',
    totalKecamatan: 3,
    totalKelurahan: 8,
    kecamatans: [
      {
        name: 'Serpong',
        kelurahans: [
          { name: 'Lengkong Gudang', status: 'active', nodesCount: 24 },
          { name: 'Serpong', status: 'active', nodesCount: 18 },
          { name: 'Cilenggang', status: 'active', nodesCount: 14 }
        ]
      },
      {
        name: 'Ciputat',
        kelurahans: [
          { name: 'Ciputat', status: 'active', nodesCount: 15 },
          { name: 'Cipayung', status: 'active', nodesCount: 12 },
          { name: 'Sawah Baru', status: 'active', nodesCount: 10 }
        ]
      },
      {
        name: 'Pondok Aren',
        kelurahans: [
          { name: 'Jurang Mangu Timur', status: 'active', nodesCount: 22 },
          { name: 'Pondok Jaya', status: 'active', nodesCount: 16 }
        ]
      }
    ]
  },
  {
    cityName: 'Bogor',
    regionType: 'Kota',
    totalKecamatan: 2,
    totalKelurahan: 6,
    kecamatans: [
      {
        name: 'Bogor Timur',
        kelurahans: [
          { name: 'Baranangsiang', status: 'active', nodesCount: 19 },
          { name: 'Katulampa', status: 'active', nodesCount: 28 },
          { name: 'Sukasari', status: 'active', nodesCount: 11 }
        ]
      },
      {
        name: 'Bogor Selatan',
        kelurahans: [
          { name: 'Batutulis', status: 'active', nodesCount: 15 },
          { name: 'Bondongan', status: 'active', nodesCount: 12 },
          { name: 'Empang', status: 'active', nodesCount: 20 }
        ]
      }
    ]
  },
  {
    cityName: 'Ciomas (Bogor)',
    regionType: 'Kabupaten',
    totalKecamatan: 1,
    totalKelurahan: 3,
    kecamatans: [
      {
        name: 'Ciomas',
        kelurahans: [
          { name: 'Ciomas Rahayu', status: 'active', nodesCount: 24 },
          { name: 'Ciomas Indah', status: 'active', nodesCount: 15 },
          { name: 'Pagelaran', status: 'active', nodesCount: 31 }
        ]
      }
    ]
  }
];

export default function CoverageDetails() {
  const [coverageData, setCoverageData] = useState<CityCoverage[]>(REGIONAL_COVERAGE_DATA);
  const [selectedCityIdx, setSelectedCityIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKec, setExpandedKec] = useState<string | null>('Kebayoran Baru');

  useEffect(() => {
    fetch('/api/coverage')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch coverage');
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCoverageData(data);
          // Set expanded kecamatan to first of first city if available
          if (data[0] && data[0].kecamatans && data[0].kecamatans[0]) {
            setExpandedKec(data[0].kecamatans[0].name);
          }
        }
      })
      .catch((err) => console.error('Using default offline coverage data:', err));
  }, []);

  const selectedCity = coverageData[selectedCityIdx] || coverageData[0] || REGIONAL_COVERAGE_DATA[0];
  const kecamatansList = (selectedCity && Array.isArray(selectedCity.kecamatans)) ? selectedCity.kecamatans : [];

  // Filter kecamatans based on search query
  const filteredKecamatans = kecamatansList.filter((kec) => {
    if (!kec) return false;
    const matchKec = (kec.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchKel = Array.isArray(kec.kelurahans) && kec.kelurahans.some((kel) => (kel?.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
    return matchKec || matchKel;
  });

  const toggleKecamatan = (name: string) => {
    setExpandedKec(expandedKec === name ? null : name);
  };

  return (
    <div className="w-full space-y-6">
      {/* City/Regency Tabs Selection */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-200">
        {coverageData.map((city, idx) => (
          <button
            key={city.cityName}
            type="button"
            onClick={() => {
              setSelectedCityIdx(idx);
              setSearchQuery('');
              // Expand the first kecamatan of the newly selected city
              if (city.kecamatans.length > 0) {
                setExpandedKec(city.kecamatans[0].name);
              } else {
                setExpandedKec(null);
              }
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 border shadow-sm ${
              selectedCityIdx === idx
                ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/10'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <MapPin className={`w-3.5 h-3.5 ${selectedCityIdx === idx ? 'text-white' : 'text-blue-600'}`} />
            {city.regionType} {city.cityName}
          </button>
        ))}
      </div>

      {/* Interactive Glassmorphic Panel Container */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Summary and Search */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-100">
              <ShieldCheck className="w-3 h-3" /> 100% FIBER OPTIK TERSEDIA
            </div>
            <h3 className="font-display font-black text-xl text-slate-900">
              {selectedCity.regionType} {selectedCity.cityName}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Jaringan backbone utama dan serat optik sekunder Patas Net telah terpasang dengan total kapasitas siap pakai. Sangat siap menerima pendaftaran pasang baru.
            </p>
          </div>

          {/* Regional Specs Box */}
          <div className="bg-white/80 border border-slate-150 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Kecamatan Tercover</p>
                <p className="font-extrabold text-sm text-slate-800">{selectedCity.totalKecamatan} Kecamatan Aktif</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Kelurahan Tercover</p>
                <p className="font-extrabold text-sm text-slate-800">{selectedCity.totalKelurahan} Titik Distribusi Kelurahan</p>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kelurahan atau kecamatan..."
              className="w-full px-3.5 py-2.5 pl-9 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none placeholder-slate-400 font-semibold"
            />
            <Search className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Right Side: Accordion Lists of Kecamatan and Kelurahan */}
        <div className="lg:col-span-7 space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {filteredKecamatans.length > 0 ? (
            filteredKecamatans.map((kec) => {
              const isExpanded = expandedKec === kec.name;
              return (
                <div
                  key={kec.name}
                  className="bg-white/95 rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm transition-all"
                >
                  {/* Kecamatan Row */}
                  <button
                    type="button"
                    onClick={() => toggleKecamatan(kec.name)}
                    className="w-full px-5 py-3.5 text-left font-bold text-xs sm:text-sm text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      Kecamatan {kec.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-medium font-mono">{kec.kelurahans.length} Kelurahan</span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Kelurahans List */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-4 space-y-2.5">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kelurahan tercover kabel fiber optik:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {kec.kelurahans.map((kel) => (
                          <div
                            key={kel.name}
                            className="bg-white px-3 py-2 rounded-xl border border-slate-150 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                          >
                            <span className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              Kel. {kel.name}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-mono">
                              FO AKTIF
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white/80 border border-dashed border-slate-300 rounded-2xl py-12 text-center text-slate-400 font-bold text-xs">
              Tidak ada kelurahan atau kecamatan yang cocok untuk kata kunci pencarian.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
