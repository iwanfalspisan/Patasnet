import React, { useState, useEffect, useRef } from 'react';
import { getLocalCoverage, saveLocalCoverage, CoverageAreaItem } from '../lib/clientFallback';
import { L, createCustomPinIcon, addResilientTileLayer, MapTileMode } from '../lib/leafletSafe';
import { MapPin, Search, CheckCircle2, Wifi, Layers } from 'lucide-react';

interface CoverageDetailsProps {
  onSelectRegion?: (region: string) => void;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  'Jakarta Selatan': { lat: -6.2615, lng: 106.8106, zoom: 12 },
  'Depok': { lat: -6.4025, lng: 106.7942, zoom: 12 },
  'Tangerang Selatan': { lat: -6.2886, lng: 106.7179, zoom: 12 },
  'Bogor': { lat: -6.5971, lng: 106.806, zoom: 12 },
  'Ciomas (Bogor)': { lat: -6.6058, lng: 106.7595, zoom: 13 },
  'Kota Tasikmalaya': { lat: -7.3274, lng: 108.2207, zoom: 13 },
  'Kabupaten Tasikmalaya': { lat: -7.3595, lng: 108.1068, zoom: 12 },
  'Kabupaten Ciamis': { lat: -7.3267, lng: 108.3537, zoom: 12 },
  'Kota Banjar': { lat: -7.3699, lng: 108.5321, zoom: 13 },
  'Kabupaten Garut': { lat: -7.2279, lng: 107.9087, zoom: 12 },
  'Kota Bandung': { lat: -6.9175, lng: 107.6191, zoom: 12 },
};

function getCoordinatesForCity(cityName: string, index: number): { lat: number; lng: number; zoom: number } {
  if (CITY_COORDINATES[cityName]) return CITY_COORDINATES[cityName];
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (cityName.toLowerCase().includes(key.replace(/Kota |Kabupaten |\(Bogor\)/gi, '').trim().toLowerCase())) {
      return coords;
    }
  }
  const angle = (index * 1.25) % (Math.PI * 2);
  return {
    lat: -6.35 + Math.sin(angle) * 0.14,
    lng: 106.8 + Math.cos(angle) * 0.14,
    zoom: 12,
  };
}

export function CoverageDetails({ onSelectRegion }: CoverageDetailsProps) {
  const [coverageData, setCoverageData] = useState<CoverageAreaItem[]>(() => getLocalCoverage());
  const [activeCity, setActiveCity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tileMode, setTileMode] = useState<MapTileMode>('street');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  useEffect(() => {
    const syncCoverage = () => {
      const local = getLocalCoverage();
      setCoverageData(local);
      setActiveCity((prev) => {
        if (prev && local.some((c) => c.cityName === prev)) return prev;
        return local[0]?.cityName || '';
      });
    };

    syncCoverage();

    fetch('/api/coverage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const currentLocal = getLocalCoverage();
          if (currentLocal.length === 0) {
            saveLocalCoverage(data, false);
            syncCoverage();
          }
        }
      })
      .catch(() => {});

    window.addEventListener('patasnet:data-updated', syncCoverage);
    window.addEventListener('storage', syncCoverage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('patasnet_sync');
      bc.onmessage = () => syncCoverage();
    } catch {}

    return () => {
      window.removeEventListener('patasnet:data-updated', syncCoverage);
      window.removeEventListener('storage', syncCoverage);
      if (bc) bc.close();
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (!mapInstanceRef.current) {
      try {
        if ((container as any)._leaflet_id) {
          (container as any)._leaflet_id = null;
          container.innerHTML = '';
        }

        const initialCoords = getCoordinatesForCity(activeCity || coverageData[0]?.cityName || 'Jakarta Selatan', 0);
        const map = L.map(container, {
          center: [initialCoords.lat, initialCoords.lng],
          zoom: 11,
          scrollWheelZoom: false,
          zoomControl: true,
        });

        tileLayerRef.current = addResilientTileLayer(map, tileMode);
        markersGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        [100, 300, 700, 1200].forEach((delay) => {
          timers.push(
            setTimeout(() => {
              try {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.invalidateSize();
                }
              } catch {}
            }, delay)
          );
        });
      } catch (err) {
        console.warn('Coverage map init error:', err);
      }
    }

    return () => {
      timers.forEach((t) => clearTimeout(t));
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (container && (container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
      }
    };
  }, []);

  // Update tile mode
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      try {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      } catch {}
    }
    tileLayerRef.current = addResilientTileLayer(mapInstanceRef.current, tileMode);
  }, [tileMode]);

  // Render coverage markers & ODP circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    coverageData.forEach((city, cityIdx) => {
      const coords = getCoordinatesForCity(city.cityName, cityIdx);
      const isSelected = city.cityName === activeCity;
      const kecs = city.kecamatans || [];
      const totalKec = kecs.length;
      const totalKel = kecs.reduce((acc, k) => acc + (k.kelurahans?.length || 0), 0);
      const totalNodes = kecs.reduce(
        (acc, k) =>
          acc +
          (k.kelurahans || []).reduce((nAcc, kl) => nAcc + (Number(kl.nodesCount) || 12), 0),
        0
      );

      const circle = L.circle([coords.lat, coords.lng], {
        color: isSelected ? '#2563eb' : '#10b981',
        fillColor: isSelected ? '#3b82f6' : '#10b981',
        fillOpacity: isSelected ? 0.18 : 0.1,
        weight: isSelected ? 2.5 : 1.5,
        radius: isSelected ? 4000 : 3000,
      });
      circle.addTo(group);

      const marker = L.marker([coords.lat, coords.lng], {
        icon: createCustomPinIcon(isSelected ? '#2563eb' : '#059669'),
      });

      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 190px; padding: 4px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #2563eb; letter-spacing: 0.06em;">${city.regionType || 'Wilayah'}</div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">${city.cityName}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">• <b>${totalKec}</b> Kecamatan Tercover</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">• <b>${totalKel}</b> Kelurahan / Desa</div>
          <div style="font-size: 11px; color: #059669; font-weight: 700;">• <b>${totalNodes}</b> Titik ODP Fiber Aktif</div>
        </div>
      `);

      marker.on('click', () => {
        setActiveCity(city.cityName);
      });

      marker.addTo(group);

      if (isSelected && kecs.length > 0) {
        kecs.forEach((kec, kIdx) => {
          const angle = (kIdx / Math.max(kecs.length, 1)) * Math.PI * 2;
          const dist = 0.016 + (kIdx % 2) * 0.008;
          const kLat = coords.lat + Math.sin(angle) * dist;
          const kLng = coords.lng + Math.cos(angle) * dist;

          const kecMarker = L.circleMarker([kLat, kLng], {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: '#2563eb',
            fillOpacity: 0.95,
          });

          const kelNames =
            (kec.kelurahans || []).map((kl) => kl.name).join(', ') || 'Tercover Fiber Optik';
          kecMarker.bindPopup(`
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 160px;">
              <div style="font-size: 10px; font-weight: 800; color: #2563eb; text-transform: uppercase;">KECAMATAN</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Kec. ${kec.name}</div>
              <div style="font-size: 11px; color: #475569;"><b>Kelurahan:</b> ${kelNames}</div>
            </div>
          `);
          kecMarker.addTo(group);
        });
      }
    });

    const activeIdx = coverageData.findIndex((c) => c.cityName === activeCity);
    if (activeIdx >= 0) {
      const targetCoords = getCoordinatesForCity(coverageData[activeIdx].cityName, activeIdx);
      try {
        map.setView([targetCoords.lat, targetCoords.lng], targetCoords.zoom || 12, { animate: true });
        setTimeout(() => map.invalidateSize(), 150);
      } catch {}
    }
  }, [coverageData, activeCity]);

  const selectedCityData =
    coverageData.find((c) => c.cityName === activeCity) || coverageData[0];

  const filteredKecamatan =
    selectedCityData?.kecamatans?.filter(
      (kec) =>
        kec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (kec.kelurahans || []).some((kel) =>
          kel.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ) || [];

  return (
    <div className="space-y-8">
      {/* Interactive Coverage Map Card */}
      <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-white font-black text-sm sm:text-base tracking-tight flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" /> Peta Interaktif Area Cakupan & Titik ODP Fiber Optik
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan jangkauan aktif di{' '}
              <span className="text-blue-400 font-bold">
                {selectedCityData?.cityName || 'Semua Wilayah'}
              </span>
              . Klik pin pada peta atau pilih tab wilayah di bawah.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-slate-800 border border-slate-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setTileMode('street')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                  tileMode === 'street'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Peta Jalan
              </button>
              <button
                type="button"
                onClick={() => setTileMode('satellite')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                  tileMode === 'satellite'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Satelit
              </button>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-800">
          <div
            ref={mapContainerRef}
            style={{ height: '360px', width: '100%' }}
            className="z-0"
          />
        </div>
      </div>

      {/* City Filter Tabs */}
      <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
        {coverageData.map((city) => {
          const active = activeCity === city.cityName;
          return (
            <button
              key={city.cityName}
              type="button"
              onClick={() => {
                setActiveCity(city.cityName);
                setSearchTerm('');
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${active ? 'bg-white' : 'bg-emerald-500'}`}
              />
              <span>
                {city.regionType ? `${city.regionType} ` : ''}
                {city.cityName}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {city.kecamatans?.length || 0} Kec
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar within City */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={`Cari Kecamatan atau Kelurahan di ${activeCity || 'wilayah ini'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-medium shadow-sm"
        />
      </div>

      {/* Kecamatan & Kelurahan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKecamatan.length > 0 ? (
          filteredKecamatan.map((kec) => (
            <div
              key={kec.name}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                    Kecamatan
                  </span>
                  <h4 className="text-base font-black text-slate-900">{kec.name}</h4>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Tercover
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Kelurahan / Desa Aktif ({kec.kelurahans?.length || 0}):
                </span>
                <div className="space-y-1.5">
                  {kec.kelurahans && kec.kelurahans.length > 0 ? (
                    kec.kelurahans.map((kel) => (
                      <div
                        key={kel.name}
                        onClick={() =>
                          onSelectRegion &&
                          onSelectRegion(`${kel.name}, Kec. ${kec.name}, ${activeCity}`)
                        }
                        className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700">{kel.name}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {kel.nodesCount || 12} Node ODP
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      Seluruh area Kec. {kec.name} tercover jaringan fiber optik.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <Wifi className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Wilayah Tidak Ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              Tidak ada kecamatan/kelurahan dengan kata kunci "{searchTerm}" di {activeCity}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoverageDetails;
