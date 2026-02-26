'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import type { LngLat } from '@/types/drive';
import {
  MAPBOX_TOKEN,
  MAPBOX_STYLE,
  MAPBOX_DEFAULT_CENTER,
  MAPBOX_DEFAULT_ZOOM,
  MAPBOX_FIT_BOUNDS_PADDING,
  MAPBOX_FIT_BOUNDS_MAX_ZOOM,
  MAPBOX_GOLD,
  MAPBOX_START_MARKER_COLOR,
} from '@/lib/mapbox';
import { splitRoute } from '@/lib/route-utils';

mapboxgl.accessToken = MAPBOX_TOKEN;

/** Props for the VehicleMap component. */
export interface VehicleMapProps {
  /** Show the pulsing gold vehicle marker. */
  showVehicleMarker?: boolean;
  /** Show the two-tone route line. */
  showRoute?: boolean;
  /** Route coordinates as [lng, lat] pairs. */
  routeCoordinates?: LngLat[];
  /** Current vehicle position [lng, lat]. */
  vehiclePosition?: LngLat;
  /** Vehicle heading in degrees (0=North). */
  heading?: number;
  /** Map center [lng, lat]. */
  center?: LngLat;
  /** Map zoom level. */
  zoom?: number;
  /** Whether map is interactive (pan/zoom). */
  interactive?: boolean;
  /** Children rendered as overlays on the map. */
  children?: React.ReactNode;
}

/**
 * Full-screen Mapbox GL JS map with vehicle marker, route rendering, and overlays.
 * Must be dynamically imported with `ssr: false` — Mapbox depends on `window`.
 */
export function VehicleMap({
  showVehicleMarker = true,
  showRoute = false,
  routeCoordinates,
  vehiclePosition,
  heading = 0,
  center = MAPBOX_DEFAULT_CENTER,
  zoom = MAPBOX_DEFAULT_ZOOM,
  interactive = true,
  children,
}: VehicleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // MUST be useState — effects depend on load completion
  const [mapLoaded, setMapLoaded] = useState(false);

  // Effect 1: Create map instance (once)
  useEffect(() => {
    if (!mapContainer.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center,
      zoom,
      interactive,
      attributionControl: false,
    });

    map.current = m;
    m.on('load', () => {
      m.resize();
      setMapLoaded(true);
    });

    return () => {
      setMapLoaded(false);
      m.remove();
      map.current = null;
      markerRef.current = null;
      markerElRef.current = null;
      startMarkerRef.current?.remove();
      startMarkerRef.current = null;
      endMarkerRef.current?.remove();
      endMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: Vehicle marker
  useEffect(() => {
    const m = map.current;
    if (!m || !showVehicleMarker) return;

    const pos = vehiclePosition ?? center;

    if (!markerElRef.current) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(201,168,76,0.2);animation:gold-pulse 2s ease-in-out infinite;"></div>
          <svg width="32" height="32" viewBox="0 0 32 32" style="transform:rotate(${heading}deg);position:relative;z-index:1;">
            <polygon points="16,2 12,11 16,8 20,11" fill="${MAPBOX_GOLD}" opacity="0.9"/>
            <circle cx="16" cy="18" r="8" fill="${MAPBOX_GOLD}"/>
            <circle cx="16" cy="18" r="4" fill="rgba(10,10,10,0.3)"/>
          </svg>
        </div>
      `;
      markerElRef.current = el;
      markerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(pos).addTo(m);
    } else {
      markerRef.current?.setLngLat(pos);
    }
  }, [showVehicleMarker, vehiclePosition, center, heading, mapLoaded]);

  // Effect 3: Heading rotation (direct DOM manipulation)
  useEffect(() => {
    if (!markerElRef.current) return;
    const svg = markerElRef.current.querySelector('svg');
    if (svg) svg.style.transform = `rotate(${heading}deg)`;
  }, [heading]);

  // Effect 4: Route rendering — depends on mapLoaded STATE
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    // Clean up previous route layers/sources
    const ids = ['route-completed', 'route-remaining'];
    for (const id of ids) {
      try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
      try { if (m.getSource(id)) m.removeSource(id); } catch { /* ignore */ }
    }
    startMarkerRef.current?.remove();
    startMarkerRef.current = null;
    endMarkerRef.current?.remove();
    endMarkerRef.current = null;

    if (!showRoute || !routeCoordinates || routeCoordinates.length < 2) return;

    const vPos = vehiclePosition ?? center;
    const { completed, remaining } = splitRoute(routeCoordinates, vPos);

    try {
      // Completed segment (dim gold — already traveled)
      if (completed.length >= 2) {
        m.addSource('route-completed', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: completed } },
        });
        m.addLayer({
          id: 'route-completed',
          type: 'line',
          source: 'route-completed',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': MAPBOX_GOLD, 'line-width': 4, 'line-opacity': 0.3 },
        });
      }

      // Remaining segment (bright gold — ahead)
      if (remaining.length >= 2) {
        m.addSource('route-remaining', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: remaining } },
        });
        m.addLayer({
          id: 'route-remaining',
          type: 'line',
          source: 'route-remaining',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': MAPBOX_GOLD, 'line-width': 4, 'line-opacity': 0.9 },
        });
      }
    } catch (err) {
      console.error('[VehicleMap] Failed to add route:', err);
    }

    // Start marker (green dot)
    const startEl = document.createElement('div');
    startEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_START_MARKER_COLOR};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(48,209,88,0.5);`;
    startMarkerRef.current = new mapboxgl.Marker({ element: startEl })
      .setLngLat(routeCoordinates[0])
      .addTo(m);

    // End marker (gold dot)
    const endEl = document.createElement('div');
    endEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_GOLD};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(201,168,76,0.5);`;
    endMarkerRef.current = new mapboxgl.Marker({ element: endEl })
      .setLngLat(routeCoordinates[routeCoordinates.length - 1])
      .addTo(m);

    // Auto-fit map to show the full route
    const bounds = new mapboxgl.LngLatBounds();
    routeCoordinates.forEach((c) => bounds.extend(c as [number, number]));
    m.fitBounds(bounds, { padding: MAPBOX_FIT_BOUNDS_PADDING, maxZoom: MAPBOX_FIT_BOUNDS_MAX_ZOOM });
  }, [mapLoaded, showRoute, routeCoordinates, vehiclePosition, center]);

  // Fit-to-route callback (for external trigger)
  const fitToRoute = useCallback(() => {
    const m = map.current;
    if (!m || !routeCoordinates || routeCoordinates.length < 2) return;
    const bounds = new mapboxgl.LngLatBounds();
    routeCoordinates.forEach((c) => bounds.extend(c as [number, number]));
    m.fitBounds(bounds, { padding: MAPBOX_FIT_BOUNDS_PADDING, maxZoom: MAPBOX_FIT_BOUNDS_MAX_ZOOM });
  }, [routeCoordinates]);

  const showFitButton = showRoute && routeCoordinates && routeCoordinates.length >= 2;

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {showFitButton && (
        <FitRouteButton onClick={fitToRoute} />
      )}

      {children}
    </div>
  );
}

/** Fit-to-route floating button. */
function FitRouteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute z-30 w-10 h-10 rounded-[10px] flex items-center justify-center cursor-pointer"
      style={{
        bottom: 310,
        right: 16,
        background: 'rgba(30,30,30,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
      title="Zoom to fit route"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 7V3H7" stroke={MAPBOX_GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 3H17V7" stroke={MAPBOX_GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 13V17H13" stroke={MAPBOX_GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 17H3V13" stroke={MAPBOX_GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
