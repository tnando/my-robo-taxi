'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';
import {
  MAPBOX_GOLD,
  MAPBOX_START_MARKER_COLOR,
  MAPBOX_FIT_BOUNDS_PADDING,
  MAPBOX_FIT_BOUNDS_MAX_ZOOM,
} from '@/lib/mapbox';
import { splitRoute } from '@/lib/route-utils';

/**
 * Manages route rendering on the map — two-tone segments, start/end markers.
 *
 * fitBounds is only called on initial route load (when routeCoordinates
 * changes), NOT on every vehicle position update. The fitToRoute callback
 * is exposed for the fit-to-route button.
 */
export function useRouteLayer(
  map: React.RefObject<mapboxgl.Map | null>,
  mapLoaded: boolean,
  showRoute: boolean,
  routeCoordinates: LngLat[] | undefined,
  vehiclePosition: LngLat,
): { fitToRoute: () => void } {
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const initialFitDoneRef = useRef(false);

  // ── Fit bounds on initial route load only ─────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || !showRoute || !routeCoordinates || routeCoordinates.length < 2) {
      initialFitDoneRef.current = false;
      return;
    }

    if (!initialFitDoneRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      routeCoordinates.forEach((c) => bounds.extend(c as [number, number]));
      m.fitBounds(bounds, { padding: MAPBOX_FIT_BOUNDS_PADDING, maxZoom: MAPBOX_FIT_BOUNDS_MAX_ZOOM });
      initialFitDoneRef.current = true;
    }
  }, [map, mapLoaded, showRoute, routeCoordinates]);

  // ── Render route layers and markers ───────────────────────────────────
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

    const { completed, remaining } = splitRoute(routeCoordinates, vehiclePosition);

    try {
      if (completed.length >= 2) {
        m.addSource('route-completed', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: completed } },
        });
        m.addLayer({
          id: 'route-completed', type: 'line', source: 'route-completed',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': MAPBOX_GOLD, 'line-width': 4, 'line-opacity': 0.3 },
        });
      }
      if (remaining.length >= 2) {
        m.addSource('route-remaining', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: remaining } },
        });
        m.addLayer({
          id: 'route-remaining', type: 'line', source: 'route-remaining',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': MAPBOX_GOLD, 'line-width': 4, 'line-opacity': 0.9 },
        });
      }
    } catch (err) {
      console.error('[VehicleMap] Failed to add route:', err);
    }

    // Start marker (green)
    const startEl = document.createElement('div');
    startEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_START_MARKER_COLOR};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(48,209,88,0.5);`;
    startMarkerRef.current = new mapboxgl.Marker({ element: startEl }).setLngLat(routeCoordinates[0]).addTo(m);

    // End marker (gold)
    const endEl = document.createElement('div');
    endEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_GOLD};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(201,168,76,0.5);`;
    endMarkerRef.current = new mapboxgl.Marker({ element: endEl }).setLngLat(routeCoordinates[routeCoordinates.length - 1]).addTo(m);
  }, [map, mapLoaded, showRoute, routeCoordinates, vehiclePosition]);

  const fitToRoute = useCallback(() => {
    const m = map.current;
    if (!m || !routeCoordinates || routeCoordinates.length < 2) return;
    const bounds = new mapboxgl.LngLatBounds();
    routeCoordinates.forEach((c) => bounds.extend(c as [number, number]));
    m.fitBounds(bounds, { padding: MAPBOX_FIT_BOUNDS_PADDING, maxZoom: MAPBOX_FIT_BOUNDS_MAX_ZOOM });
  }, [map, routeCoordinates]);

  return { fitToRoute };
}
