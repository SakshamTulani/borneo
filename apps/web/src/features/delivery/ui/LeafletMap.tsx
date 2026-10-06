import { useEffect, useRef } from 'react';
import type { Map as LeafletMapInstance } from 'leaflet';
import type { MapTiles } from '@/shared/lib/mapTiles';

export type MapCentre = { lat: number; lng: number };

type Props = {
  tiles: MapTiles;
  /** Where the map opens. Read once, on mount. */
  initial: MapCentre & { zoom: number };
  /** Moves the map when it changes (e.g. "Use my location"). */
  focus?: (MapCentre & { zoom: number }) | undefined;
  /** The centre after every pan or zoom; the pin is drawn at the centre. */
  onCentreChange: (centre: MapCentre) => void;
  label: string;
};

/**
 * Leaflet loads only in the browser, after mount (ADR-0008). Arrow keys pan and +/− zoom once
 * the map has focus, so the pin can be placed without a pointer.
 */
export function LeafletMap({ tiles, initial, focus, onCentreChange, label }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMapInstance | null>(null);
  const report = useRef(onCentreChange);
  const start = useRef({ initial, tiles });
  const pending = useRef(focus);

  useEffect(() => {
    report.current = onCentreChange;
  }, [onCentreChange]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !container.current) return;
      // A focus requested while Leaflet was loading (e.g. a quick "Use my location") wins.
      const { lat, lng, zoom } = pending.current ?? start.current.initial;
      const m = L.map(container.current, { center: [lat, lng], zoom, keyboard: true });
      const { url, attribution } = start.current.tiles;
      L.tileLayer(url, { attribution, maxZoom: 19 }).addTo(m);
      m.on('moveend', () => {
        const c = m.getCenter();
        report.current({ lat: c.lat, lng: c.lng });
      });
      // The dialog may still be animating in; measure again once it has a size.
      requestAnimationFrame(() => m.invalidateSize());
      map.current = m;
      report.current({ lat, lng });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    pending.current = focus;
    if (focus) map.current?.setView([focus.lat, focus.lng], focus.zoom);
  }, [focus]);

  return (
    <div
      ref={container}
      role="application"
      aria-label={label}
      className="size-full rounded-lg bg-muted"
    />
  );
}
