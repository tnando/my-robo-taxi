'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';
import {
  MAPBOX_GOLD,
  MAPBOX_START_MARKER_COLOR,
} from '@/lib/mapbox';
import { splitRoute } from '@/lib/route-utils';

/** GeoJSON Feature for a LineString — used for route source data. */
function lineFeature(coords: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords },
  };
}

/** Empty LineString feature (no coordinates). */
const EMPTY_LINE: GeoJSON.Feature<GeoJSON.LineString> = lineFeature([]);

/** Return type of the useRouteLayer hook. */
export interface UseRouteLayerReturn {
  /** The remaining (ahead of vehicle) route segment, for route overview fitBounds. */
  remainingRoute: LngLat[] | undefined;
}

/**
 * Manages route rendering on the map — two-tone segments, start/end markers.
 *
 * Sources and layers are created **once** on mount (when route appears).
 * Position updates use `source.setData()` to update geometry in-place,
 * avoiding the expensive teardown/re-add cycle.
 *
 * fitBounds is NOT called on position updates — the map follow hook
 * handles camera behavior (including route-overview mode).
 */
export function useRouteLayer(
  map: React.RefObject<mapboxgl.Map | null>,
  mapLoaded: boolean,
  showRoute: boolean,
  routeCoordinates: LngLat[] | undefined,
  vehiclePosition: LngLat,
): UseRouteLayerReturn {
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const sourcesAddedRef = useRef(false);
  const [remainingRoute, setRemainingRoute] = useState<LngLat[] | undefined>(undefined);

  // ── Create sources and layers once when route first appears ─────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    // Clean up if route is hidden or missing
    if (!showRoute || !routeCoordinates || routeCoordinates.length < 2) {
      removeRouteLayers(m, startMarkerRef, endMarkerRef);
      sourcesAddedRef.current = false;
      setRemainingRoute(undefined);
      return;
    }

    // Add sources + layers if not already present — wait for style to load
    if (!sourcesAddedRef.current) {
      const setup = () => {
        addRouteSources(m);
        addRouteLayers(m);
        sourcesAddedRef.current = true;
        addEndpointMarkers(m, routeCoordinates, startMarkerRef, endMarkerRef);
      };

      if (m.isStyleLoaded()) {
        setup();
      } else {
        m.once('style.load', setup);
      }
    }

    // Cleanup on unmount or route change (different route)
    return () => {
      removeRouteLayers(m, startMarkerRef, endMarkerRef);
      sourcesAddedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapLoaded, showRoute, routeCoordinates]);

  // ── Update route data in-place on vehicle position change ───────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || !showRoute || !routeCoordinates || routeCoordinates.length < 2) {
      return;
    }

    if (!sourcesAddedRef.current) return;

    const { completed, remaining } = splitRoute(routeCoordinates, vehiclePosition);
    setRemainingRoute(remaining.length >= 2 ? remaining : undefined);

    const completedSource = m.getSource('route-completed') as mapboxgl.GeoJSONSource | undefined;
    const remainingSource = m.getSource('route-remaining') as mapboxgl.GeoJSONSource | undefined;

    if (completedSource) {
      completedSource.setData(completed.length >= 2 ? lineFeature(completed) : EMPTY_LINE);
    }
    if (remainingSource) {
      remainingSource.setData(remaining.length >= 2 ? lineFeature(remaining) : EMPTY_LINE);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapLoaded, showRoute, routeCoordinates, vehiclePosition[0], vehiclePosition[1]]);

  return { remainingRoute };
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Add empty GeoJSON sources for both route segments. */
function addRouteSources(m: mapboxgl.Map): void {
  try {
    if (!m.getSource('route-completed')) {
      m.addSource('route-completed', { type: 'geojson', data: EMPTY_LINE });
    }
    if (!m.getSource('route-remaining')) {
      m.addSource('route-remaining', { type: 'geojson', data: EMPTY_LINE });
    }
  } catch (err) {
    console.error('[useRouteLayer] Failed to add sources:', err);
  }
}

/** Add line layers for completed (dim) and remaining (bright) route segments. */
function addRouteLayers(m: mapboxgl.Map): void {
  try {
    if (!m.getLayer('route-completed')) {
      m.addLayer({
        id: 'route-completed',
        type: 'line',
        source: 'route-completed',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': MAPBOX_GOLD, 'line-width': 4, 'line-opacity': 0.3 },
      });
    }
    if (!m.getLayer('route-remaining')) {
      m.addLayer({
        id: 'route-remaining',
        type: 'line',
        source: 'route-remaining',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': MAPBOX_GOLD, 'line-width': 4, 'line-opacity': 0.9 },
      });
    }
  } catch (err) {
    console.error('[useRouteLayer] Failed to add layers:', err);
  }
}

/** Add start (green) and end (gold) endpoint markers. */
function addEndpointMarkers(
  m: mapboxgl.Map,
  routeCoordinates: LngLat[],
  startRef: React.MutableRefObject<mapboxgl.Marker | null>,
  endRef: React.MutableRefObject<mapboxgl.Marker | null>,
): void {
  // Start marker (green)
  const startEl = document.createElement('div');
  startEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_START_MARKER_COLOR};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(48,209,88,0.5);`;
  startRef.current = new mapboxgl.Marker({ element: startEl })
    .setLngLat(routeCoordinates[0])
    .addTo(m);

  // End marker (gold)
  const endEl = document.createElement('div');
  endEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_GOLD};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(201,168,76,0.5);`;
  endRef.current = new mapboxgl.Marker({ element: endEl })
    .setLngLat(routeCoordinates[routeCoordinates.length - 1])
    .addTo(m);
}

/** Remove route layers, sources, and endpoint markers. */
function removeRouteLayers(
  m: mapboxgl.Map,
  startRef: React.MutableRefObject<mapboxgl.Marker | null>,
  endRef: React.MutableRefObject<mapboxgl.Marker | null>,
): void {
  const ids = ['route-completed', 'route-remaining'];
  for (const id of ids) {
    try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
    try { if (m.getSource(id)) m.removeSource(id); } catch { /* ignore */ }
  }
  startRef.current?.remove();
  startRef.current = null;
  endRef.current?.remove();
  endRef.current = null;
}
