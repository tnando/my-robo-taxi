'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import type { LngLat } from '@/types/drive';
import {
  MAPBOX_TOKEN,
  MAPBOX_STYLE,
  MAPBOX_DEFAULT_CENTER,
  MAPBOX_FIT_BOUNDS_MAX_ZOOM,
  MAPBOX_GOLD,
  MAPBOX_START_MARKER_COLOR,
} from '@/lib/mapbox';

mapboxgl.accessToken = MAPBOX_TOKEN;

/** Props for the DriveRouteMap component. */
export interface DriveRouteMapProps {
  /** Route coordinates as [lng, lat] pairs. */
  routeCoordinates: LngLat[];
  /** Optional CSS class for the container. */
  className?: string;
}

/**
 * Non-interactive Mapbox map showing a completed drive route.
 * Renders the full route in gold with green start and gold end markers.
 * Must be dynamically imported with `ssr: false`.
 */
export function DriveRouteMap({ routeCoordinates, className = '' }: DriveRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Effect 1: Create map
  useEffect(() => {
    if (!mapContainer.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: routeCoordinates[0] ?? MAPBOX_DEFAULT_CENTER,
      zoom: 11,
      interactive: false,
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: Render route + markers
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || routeCoordinates.length < 2) return;

    // Clean previous
    try { if (m.getLayer('drive-route')) m.removeLayer('drive-route'); } catch { /* */ }
    try { if (m.getSource('drive-route')) m.removeSource('drive-route'); } catch { /* */ }

    m.addSource('drive-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeCoordinates },
      },
    });

    m.addLayer({
      id: 'drive-route',
      type: 'line',
      source: 'drive-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': MAPBOX_GOLD, 'line-width': 3, 'line-opacity': 0.8 },
    });

    // Start marker (green)
    const startEl = document.createElement('div');
    startEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_START_MARKER_COLOR};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(48,209,88,0.5);`;
    new mapboxgl.Marker({ element: startEl }).setLngLat(routeCoordinates[0]).addTo(m);

    // End marker (gold)
    const endEl = document.createElement('div');
    endEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_GOLD};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(201,168,76,0.5);`;
    new mapboxgl.Marker({ element: endEl }).setLngLat(routeCoordinates[routeCoordinates.length - 1]).addTo(m);

    // Fit to route bounds
    const bounds = new mapboxgl.LngLatBounds();
    routeCoordinates.forEach((c) => bounds.extend(c as [number, number]));
    m.fitBounds(bounds, {
      padding: { top: 30, bottom: 30, left: 30, right: 30 },
      maxZoom: MAPBOX_FIT_BOUNDS_MAX_ZOOM,
    });
  }, [mapLoaded, routeCoordinates]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
