import L from 'leaflet';

/**
 * Creates a crisp, dependency-free SVG map pin icon that never breaks
 * even if external CDNs (unpkg/cdnjs) are blocked by the user's ISP.
 */
export function createCustomPinIcon(color = '#2563eb'): L.DivIcon {
  const svgHtml = `
    <div style="position: relative; width: 34px; height: 44px; filter: drop-shadow(0 4px 6px rgba(15, 23, 42, 0.35));">
      <svg viewBox="0 0 34 44" width="34" height="44" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 1C8.163 1 1 8.163 1 17c0 11.45 14.25 24.75 15.12 25.55a1.35 1.35 0 0 0 1.76 0C18.75 41.75 33 28.45 33 17 33 8.163 25.837 1 17 1z" fill="${color}" stroke="#ffffff" stroke-width="2.2"/>
        <circle cx="17" cy="16.5" r="6.5" fill="#ffffff"/>
        <circle cx="17" cy="16.5" r="3" fill="${color}"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'leaflet-div-icon',
    iconSize: [34, 44],
    iconAnchor: [17, 43],
    popupAnchor: [0, -40],
  });
}

export type MapTileMode = 'street' | 'light' | 'satellite';

const TILE_PROVIDERS: Record<
  MapTileMode,
  {
    url: string;
    fallbackUrl: string;
    attribution: string;
    maxZoom: number;
  }
> = {
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
};

/**
 * Attaches a tile layer with automatic multi-CDN fallback so map tiles
 * always appear even if a specific tile server is rate-limited or blocked.
 */
export function addResilientTileLayer(map: L.Map, mode: MapTileMode = 'street'): L.TileLayer {
  const cfg = TILE_PROVIDERS[mode] || TILE_PROVIDERS.street;
  let errorCount = 0;
  let switchedToFallback = false;

  const layer = L.tileLayer(cfg.url, {
    attribution: cfg.attribution,
    maxZoom: cfg.maxZoom,
    crossOrigin: true,
  });

  layer.on('tileerror', () => {
    errorCount += 1;
    if (errorCount >= 3 && !switchedToFallback && cfg.fallbackUrl) {
      switchedToFallback = true;
      try {
        layer.setUrl(cfg.fallbackUrl);
      } catch {}
    }
  });

  layer.addTo(map);
  return layer;
}

// Defensive patches to prevent Leaflet lifecycle crashes when components unmount
// or re-render during zoom animations/transitions (e.g. "_leaflet_pos" undefined errors)
if (typeof window !== 'undefined' && L) {
  try {
    L.Marker.prototype.options.icon = createCustomPinIcon('#2563eb');
  } catch {}

  if (L.DomUtil && typeof L.DomUtil.getPosition === 'function') {
    const origGetPosition = L.DomUtil.getPosition;
    L.DomUtil.getPosition = function (el: HTMLElement) {
      if (!el) {
        return new L.Point(0, 0);
      }
      try {
        const pos = origGetPosition(el);
        return pos || new L.Point(0, 0);
      } catch {
        return (el && (el as any)._leaflet_pos) || new L.Point(0, 0);
      }
    };
  }

  if (L.Map && L.Map.prototype) {
    const proto = L.Map.prototype as any;

    // Prevent "Map container is already initialized" in React StrictMode or rapid remounts
    if (typeof proto._initContainer === 'function') {
      const origInitContainer = proto._initContainer;
      proto._initContainer = function (id: any) {
        const container = typeof id === 'string' ? document.getElementById(id) : id;
        if (container && (container as any)._leaflet_id) {
          (container as any)._leaflet_id = null;
          container.innerHTML = '';
        }
        return origInitContainer.apply(this, arguments as any);
      };
    }

    if (typeof proto._getMapPanePos === 'function') {
      const origGetMapPanePos = proto._getMapPanePos;
      proto._getMapPanePos = function () {
        if (!this._mapPane) {
          return new L.Point(0, 0);
        }
        try {
          return origGetMapPanePos ? origGetMapPanePos.call(this) : new L.Point(0, 0);
        } catch {
          return new L.Point(0, 0);
        }
      };
    }

    if (typeof proto._onZoomTransitionEnd === 'function') {
      const origOnZoomTransitionEnd = proto._onZoomTransitionEnd;
      proto._onZoomTransitionEnd = function () {
        if (!this._mapPane || !this._container) {
          return this;
        }
        try {
          if (origOnZoomTransitionEnd) {
            return origOnZoomTransitionEnd.apply(this, arguments as any) || this;
          }
        } catch {
          // Suppress transition errors on torn-down or unmounting maps
        }
        return this;
      };
    }

    if (typeof proto._getNewPixelOrigin === 'function') {
      const origGetNewPixelOrigin = proto._getNewPixelOrigin;
      proto._getNewPixelOrigin = function () {
        if (!this._mapPane || !this._container) {
          return new L.Point(0, 0);
        }
        try {
          return origGetNewPixelOrigin ? origGetNewPixelOrigin.apply(this, arguments as any) : new L.Point(0, 0);
        } catch {
          return new L.Point(0, 0);
        }
      };
    }

    if (typeof proto._move === 'function') {
      const origMove = proto._move;
      proto._move = function () {
        if (!this._mapPane || !this._container) {
          return this;
        }
        try {
          if (origMove) {
            return origMove.apply(this, arguments as any) || this;
          }
        } catch {
          // Suppress move errors during unmount
        }
        return this;
      };
    }
  }
}

export { L };
export default L;

