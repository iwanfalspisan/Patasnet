import React, { useEffect, useRef, useState } from 'react';
import L from '../lib/leafletSafe';
import { Search, MapPin } from 'lucide-react';

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, addressDetail?: string) => void;
  initialCoords?: [number, number];
}

export default function MapPicker({ onLocationSelect, initialCoords }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number]>(
    initialCoords || [-6.2088, 106.8456] // Default Jakarta
  );
  const [resolvedAddress, setResolvedAddress] = useState('');

  // Setup Leaflet default marker icon
  useEffect(() => {
    // Override default icon URLs to load from UNPKG CDN to avoid Vite path errors
    const DefaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let resizeObserver: ResizeObserver | null = null;
    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(selectedCoords, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const marker = L.marker(selectedCoords, { draggable: true }).addTo(map);
      markerRef.current = marker;
      mapRef.current = map;

      // Trigger callback initially
      onLocationSelect(selectedCoords[0], selectedCoords[1]);

      // Handle marker drag
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setSelectedCoords([position.lat, position.lng]);
        onLocationSelect(position.lat, position.lng);
        reverseGeocode(position.lat, position.lng);
      });

      // Handle map click
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setSelectedCoords([lat, lng]);
        onLocationSelect(lat, lng);
        reverseGeocode(lat, lng);
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

  // Reverse geocode to get readable address details
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'id,en',
            'User-Agent': 'PatasNetWifi-App'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        const addressName = data.display_name || '';
        setResolvedAddress(addressName);
        onLocationSelect(lat, lng, addressName);
      }
    } catch (e) {
      console.error('Failed to resolve address:', e);
    }
  };

  // Search Address using OpenStreetMap Nominatim API
  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'id,en',
            'User-Agent': 'PatasNetWifi-App'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const firstResult = data[0];
          const lat = parseFloat(firstResult.lat);
          const lng = parseFloat(firstResult.lon);
          const displayName = firstResult.display_name;

          setSelectedCoords([lat, lng]);
          setResolvedAddress(displayName);

          if (mapRef.current && markerRef.current) {
            mapRef.current.setView([lat, lng], 15);
            markerRef.current.setLatLng([lat, lng]);
          }

          onLocationSelect(lat, lng, displayName);
        } else {
          alert('Lokasi tidak ditemukan. Silakan cari kata kunci lain.');
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            id="map-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder="Cari jalan, desa, kelurahan, atau kecamatan..."
            className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-slate-50"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          id="map-search-btn"
          disabled={searching}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 min-w-[90px]"
        >
          {searching ? 'Mencari...' : 'Cari'}
        </button>
      </div>

      {/* Map display */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-inner bg-slate-100">
        <div
          ref={mapContainerRef}
          className="w-full h-80 z-10"
          style={{ minHeight: '320px' }}
        />
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg border border-slate-100 shadow-md z-30 max-w-xs pointer-events-none text-[11px] space-y-1">
          <p className="font-semibold text-slate-800 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600" /> Koordinat Terpilih
          </p>
          <p className="font-mono text-slate-500">
            Lat: {selectedCoords[0].toFixed(6)} <br />
            Lng: {selectedCoords[1].toFixed(6)}
          </p>
        </div>
      </div>

      {resolvedAddress && (
        <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex items-start gap-2.5 text-xs text-blue-800">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Lokasi Terpilih (Sesuai Peta):</span>
            <p className="mt-0.5 text-slate-600 leading-relaxed">{resolvedAddress}</p>
          </div>
        </div>
      )}
    </div>
  );
}
