import React, { useEffect, useRef, useState } from 'react';
import L, { createCustomPinIcon, addResilientTileLayer, MapTileMode } from '../lib/leafletSafe';
import { Search, MapPin, Navigation, Crosshair, CheckCircle2, AlertCircle, Compass, Layers, RefreshCw } from 'lucide-react';

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, addressDetail?: string) => void;
  initialCoords?: [number, number];
}

interface SearchResultItem {
  lat: number;
  lon: number;
  displayName: string;
}

const QUICK_LOCATIONS: { label: string; coords: [number, number] }[] = [
  { label: 'Tasikmalaya', coords: [-7.3274, 108.2207] },
  { label: 'Ciamis', coords: [-7.3266, 108.3537] },
  { label: 'Banjar', coords: [-7.3699, 108.5321] },
  { label: 'Garut', coords: [-7.2279, 107.9087] },
  { label: 'Bandung', coords: [-6.9175, 107.6191] },
  { label: 'Jakarta', coords: [-6.2088, 106.8456] },
];

export default function MapPicker({ onLocationSelect, initialCoords }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [tileMode, setTileMode] = useState<MapTileMode>('street');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [locatingGps, setLocatingGps] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<[number, number]>(
    initialCoords || [-7.3274, 108.2207] // Default Tasikmalaya / Priangan Timur area
  );
  const [latInput, setLatInput] = useState<string>(String((initialCoords || [-7.3274, 108.2207])[0]));
  const [lngInput, setLngInput] = useState<string>(String((initialCoords || [-7.3274, 108.2207])[1]));
  const [resolvedAddress, setResolvedAddress] = useState('');

  const updateMapAndMarker = (lat: number, lng: number, zoom = 16, addressText?: string) => {
    const clampedLat = Math.max(-90, Math.min(90, Number(lat.toFixed(6))));
    const clampedLng = Math.max(-180, Math.min(180, Number(lng.toFixed(6))));
    setSelectedCoords([clampedLat, clampedLng]);
    setLatInput(String(clampedLat));
    setLngInput(String(clampedLng));

    if (mapRef.current && markerRef.current) {
      try {
        mapRef.current.invalidateSize();
        markerRef.current.setLatLng([clampedLat, clampedLng]);
        mapRef.current.setView([clampedLat, clampedLng], zoom, { animate: true });
      } catch {}
    }

    if (addressText !== undefined) {
      setResolvedAddress(addressText);
      onLocationSelect(clampedLat, clampedLng, addressText);
    } else {
      onLocationSelect(clampedLat, clampedLng);
      reverseGeocode(clampedLat, clampedLng);
    }
  };

  // Switch tile mode dynamically
  const handleSwitchTileMode = (mode: MapTileMode) => {
    setTileMode(mode);
    if (mapRef.current) {
      try {
        if (tileLayerRef.current) {
          mapRef.current.removeLayer(tileLayerRef.current);
        }
        tileLayerRef.current = addResilientTileLayer(mapRef.current, mode);
        mapRef.current.invalidateSize();
      } catch {}
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let resizeObserver: ResizeObserver | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(selectedCoords, 15);

      tileLayerRef.current = addResilientTileLayer(map, tileMode);

      const pinIcon = createCustomPinIcon('#2563eb');
      const marker = L.marker(selectedCoords, { draggable: true, icon: pinIcon }).addTo(map);
      marker.bindPopup('<b>Titik Pemasangan WiFi</b><br/>Geser pin biru atau klik peta untuk menyesuaikan lokasi rumah Anda.').openPopup();

      markerRef.current = marker;
      mapRef.current = map;

      // Trigger callback initially
      onLocationSelect(selectedCoords[0], selectedCoords[1]);
      reverseGeocode(selectedCoords[0], selectedCoords[1]);

      // Handle marker drag
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        const lat = Number(position.lat.toFixed(6));
        const lng = Number(position.lng.toFixed(6));
        setSelectedCoords([lat, lng]);
        setLatInput(String(lat));
        setLngInput(String(lng));
        onLocationSelect(lat, lng);
        reverseGeocode(lat, lng);
        setStatusFeedback({ type: 'success', text: 'Titik koordinat diperbarui dari geseran pin.' });
      });

      // Handle map click
      map.on('click', (e) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        marker.setLatLng([lat, lng]);
        setSelectedCoords([lat, lng]);
        setLatInput(String(lat));
        setLngInput(String(lng));
        onLocationSelect(lat, lng);
        reverseGeocode(lat, lng);
        setStatusFeedback({ type: 'success', text: 'Titik koordinat dipilih pada peta.' });
      });

      // Multi-stage invalidateSize to ensure CSS page transitions don't offset map click coordinates
      [50, 200, 450, 900].forEach((delay) => {
        timers.push(
          setTimeout(() => {
            if (mapRef.current) {
              try {
                mapRef.current.invalidateSize();
              } catch {}
            }
          }, delay)
        );
      });

      // Handle container resize observer
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            try {
              mapRef.current.invalidateSize();
            } catch {}
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }
    } catch (err) {
      console.warn('Map initialization caught error:', err);
    }

    return () => {
      timers.forEach((t) => clearTimeout(t));
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch {}
      }
      if (mapRef.current) {
        try {
          mapRef.current.stop();
          mapRef.current.remove();
        } catch (e) {
          console.warn('Map unmount cleanup ignored:', e);
        }
        mapRef.current = null;
      }
    };
  }, []);

  // Reverse geocode to get readable address details (Server proxy -> Nominatim direct)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // 1. Try server proxy
      try {
        const proxyRes = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData && proxyData.display_name) {
            setResolvedAddress(proxyData.display_name);
            onLocationSelect(lat, lng, proxyData.display_name);
            return;
          }
        }
      } catch {}

      // 2. Fallback to browser Nominatim fetch
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`
      );
      if (response.ok) {
        const data = await response.json();
        const addressName = data.display_name || '';
        if (addressName) {
          setResolvedAddress(addressName);
          onLocationSelect(lat, lng, addressName);
        }
      }
    } catch (e) {
      console.warn('Failed to resolve address:', e);
    }
  };

  // Search Address using Server Proxy -> Nominatim -> Photon fallback
  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setStatusFeedback(null);
    setSearchResults([]);

    try {
      let items: SearchResultItem[] = [];

      // 1. Try Server Proxy first
      try {
        const proxyRes = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (Array.isArray(proxyData) && proxyData.length > 0) {
            items = proxyData.map((d: any) => ({
              lat: parseFloat(d.lat),
              lon: parseFloat(d.lon),
              displayName: d.display_name,
            }));
          }
        }
      } catch {}

      // 2. Try Direct Nominatim if server proxy returned empty (e.g. on static Vercel hosting)
      if (items.length === 0) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=id&accept-language=id&q=${encodeURIComponent(query)}`
          );
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (Array.isArray(nomData) && nomData.length > 0) {
              items = nomData.map((d: any) => ({
                lat: parseFloat(d.lat),
                lon: parseFloat(d.lon),
                displayName: d.display_name,
              }));
            }
          }
        } catch {}
      }

      // 3. Fallback to Photon Komoot OSM geocoder
      if (items.length === 0) {
        try {
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
          );
          if (photonRes.ok) {
            const photonData = await photonRes.json();
            if (photonData?.features?.length > 0) {
              items = photonData.features.map((f: any) => {
                const props = f.properties || {};
                const parts = [props.name, props.street, props.district, props.city, props.state, props.country].filter(Boolean);
                return {
                  lat: Number(f.geometry.coordinates[1]),
                  lon: Number(f.geometry.coordinates[0]),
                  displayName: parts.join(', '),
                };
              });
            }
          }
        } catch {}
      }

      if (items.length > 0) {
        setSearchResults(items);
        const first = items[0];
        updateMapAndMarker(first.lat, first.lon, 16, first.displayName);
        setStatusFeedback({
          type: 'success',
          text: `Ditemukan ${items.length} lokasi. Pin diarahkan ke hasil teratas.`,
        });
      } else {
        setStatusFeedback({
          type: 'error',
          text: 'Lokasi tidak ditemukan. Coba ketik nama kecamatan/kota (contoh: Tasikmalaya) atau klik langsung pada peta.',
        });
      }
    } catch (err) {
      setStatusFeedback({
        type: 'error',
        text: 'Gagal mencari lokasi. Silakan geser pin atau klik langsung pada peta.',
      });
    } finally {
      setSearching(false);
    }
  };

  // Detect user's current GPS position
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setStatusFeedback({
        type: 'error',
        text: 'Browser Anda tidak mendukung fitur GPS Geolocation.',
      });
      return;
    }

    setLocatingGps(true);
    setStatusFeedback({ type: 'info', text: 'Mendeteksi titik koordinat GPS perangkat Anda...' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        updateMapAndMarker(lat, lng, 17);
        setStatusFeedback({
          type: 'success',
          text: 'Lokasi GPS berhasil ditemukan! Anda dapat menggeser pin biru jika ingin lebih presisi.',
        });
      },
      (err) => {
        setLocatingGps(false);
        setStatusFeedback({
          type: 'error',
          text:
            err.code === 1
              ? 'Izin akses lokasi GPS ditolak di browser. Silakan cari nama daerah atau klik langsung di peta.'
              : 'Gagal mendeteksi sinyal GPS. Silakan cari nama daerah atau klik langsung di peta.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleManualCoordApply = () => {
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setStatusFeedback({ type: 'error', text: 'Masukkan angka Latitude & Longitude yang valid.' });
      return;
    }
    updateMapAndMarker(parsedLat, parsedLng, 16);
    setStatusFeedback({ type: 'success', text: 'Titik koordinat manual berhasil diterapkan ke peta.' });
  };

  return (
    <div className="space-y-3">
      {/* Search Bar & GPS Action */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            id="map-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Ketik jalan, kelurahan, kecamatan, atau kota (contoh: Cihideung Tasikmalaya)..."
            className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-xs bg-slate-50"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSearch()}
            id="map-search-btn"
            disabled={searching}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 min-w-[85px] active:scale-95 disabled:opacity-60"
          >
            <Search className="w-3.5 h-3.5" />
            {searching ? 'Mencari...' : 'Cari'}
          </button>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locatingGps}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
            title="Deteksi Lokasi GPS Saya Saat Ini"
          >
            <Crosshair className={`w-3.5 h-3.5 ${locatingGps ? 'animate-spin' : ''}`} />
            <span>{locatingGps ? 'Mendeteksi...' : 'Lokasi GPS Saya'}</span>
          </button>
        </div>
      </div>

      {/* Quick Coverage Area Presets & Map Style Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5 text-blue-600" /> Pilih Cepat Kota:
          </span>
          {QUICK_LOCATIONS.map((loc) => (
            <button
              key={loc.label}
              type="button"
              onClick={() => {
                setSearchResults([]);
                updateMapAndMarker(loc.coords[0], loc.coords[1], 14);
                setStatusFeedback({
                  type: 'info',
                  text: `Peta diarahkan ke ${loc.label}. Klik peta atau geser pin biru ke titik rumah Anda.`,
                });
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-semibold rounded-lg border border-slate-200/80 transition active:scale-95"
            >
              {loc.label}
            </button>
          ))}
        </div>

        {/* Map Layer Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <Layers className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
          {(
            [
              { id: 'street', label: 'Peta Jalan' },
              { id: 'satellite', label: 'Satelit' },
            ] as { id: MapTileMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSwitchTileMode(m.id)}
              className={`px-2 py-1 rounded-lg font-bold text-[10px] transition ${
                tileMode === m.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              {m.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (mapRef.current) {
                handleSwitchTileMode(tileMode);
                mapRef.current.setView(selectedCoords, 15);
              }
            }}
            className="p-1 text-slate-500 hover:text-blue-600 rounded-lg"
            title="Segarkan Tampilan Peta"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Search Results Dropdown List */}
      {searchResults.length > 1 && (
        <div className="bg-white border border-blue-200 rounded-xl shadow-md p-2 space-y-1 max-h-40 overflow-y-auto text-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-0.5">
            Pilih Hasil Pencarian Lokasi ({searchResults.length}):
          </p>
          {searchResults.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                updateMapAndMarker(item.lat, item.lon, 17, item.displayName);
                setSearchResults([]);
                setStatusFeedback({ type: 'success', text: 'Titik lokasi dipilih dari hasil pencarian.' });
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition flex items-start gap-2"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{item.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Status Feedback Banner */}
      {statusFeedback && (
        <div
          className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-2 ${
            statusFeedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : statusFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {statusFeedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span className="font-medium">{statusFeedback.text}</span>
        </div>
      )}

      {/* Interactive Map Display */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 shadow-inner bg-slate-200" style={{ height: '380px' }}>
        <div
          ref={mapContainerRef}
          className="w-full h-full z-10 cursor-crosshair"
          style={{ width: '100%', height: '380px' }}
        />
        <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg z-30 pointer-events-none text-[11px] font-semibold flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-yellow-400" />
          <span>Klik Peta atau Geser Pin Biru</span>
        </div>
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-2 rounded-xl border border-slate-200/80 shadow-lg z-30 max-w-xs pointer-events-none text-[11px] space-y-0.5">
          <p className="font-extrabold text-slate-800 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600" /> Titik Koordinat Terpilih
          </p>
          <p className="font-mono text-slate-600 text-[10px]">
            Lat: <strong>{selectedCoords[0].toFixed(6)}</strong> | Lng: <strong>{selectedCoords[1].toFixed(6)}</strong>
          </p>
        </div>
      </div>

      {/* Manual Coordinate Input & Resolved Address Box */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200/80">
        <div className="sm:col-span-5">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Latitude (Garis Lintang)</label>
          <input
            type="text"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="-7.327400"
          />
        </div>
        <div className="sm:col-span-5">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Longitude (Garis Bujur)</label>
          <input
            type="text"
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="108.220700"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={handleManualCoordApply}
            className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs transition active:scale-95"
          >
            Terapkan
          </button>
        </div>
      </div>

      {resolvedAddress && (
        <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Detail Titik Lokasi Peta:</span>
            <p className="mt-0.5 text-slate-600 leading-relaxed">{resolvedAddress}</p>
          </div>
        </div>
      )}
    </div>
  );
}
