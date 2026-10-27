import L from 'leaflet';

// Defensive patches to prevent Leaflet lifecycle crashes when components unmount
// or re-render during zoom animations/transitions (e.g. "_leaflet_pos" undefined errors)
if (typeof window !== 'undefined' && L) {
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
          return;
        }
        try {
          if (origOnZoomTransitionEnd) {
            origOnZoomTransitionEnd.apply(this, arguments as any);
          }
        } catch {
          // Suppress transition errors on torn-down or unmounting maps
        }
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
          return;
        }
        try {
          if (origMove) {
            origMove.apply(this, arguments as any);
          }
        } catch {
          // Suppress move errors during unmount
        }
      };
    }
  }
}

export default L;
