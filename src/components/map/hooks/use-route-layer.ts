'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';
import {
  MAPBOX_GOLD,
  MAPBOX_START_MARKER_COLOR,
} from '@/lib/mapbox';

// ── Layer IDs and source IDs ───────────────────────────────────────────────

const COMPLETED_SOURCE = 'route-completed';
const COMPLETED_LAYER = 'route-completed-line';
const REMAINING_SOURCE = 'route-remaining';
const REMAINING_LAYER = 'route-remaining-line';

// ── Colors ─────────────────────────────────────────────────────────────────

/** Dim gold for the completed (behind vehicle) portion. */
const GOLD_DIM = 'rgba(201, 168, 76, 0.3)';
/** Bright gold for the remaining (ahead of vehicle) portion. */
const GOLD_BRIGHT = 'rgba(201, 168, 76, 0.9)';

// ── GeoJSON helpers ────────────────────────────────────────────────────────

function lineFeature(coords: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords },
  };
}

const EMPTY_LINE: GeoJSON.Feature<GeoJSON.LineString> = lineFeature([]);

// ── Return type ────────────────────────────────────────────────────────────

/** Return type of the useRouteLayer hook. */
export interface UseRouteLayerReturn {
  remainingRoute: LngLat[] | undefined;
}

// ── Main hook ──────────────────────────────────────────────────────────────

/**
 * Renders a route as one or two overlapping Mapbox layers.
 *
 * **Navigation route** (two-tone): When `isDrivenPath` is false, uses two
 * layers for a flicker-free dim/bright effect — dim gold behind the vehicle,
 * bright gold ahead. The remaining layer updates only when the vehicle
 * passes a new waypoint (~30s on a highway), avoiding per-tick flicker.
 *
 * **Driven GPS path** (single layer): When `isDrivenPath` is true, the route
 * represents the vehicle's accumulated GPS trail. All points are behind the
 * vehicle, so the entire route renders as a single bright gold line.
 */
export function useRouteLayer(
  map: React.RefObject<mapboxgl.Map | null>,
  mapLoaded: boolean,
  showRoute: boolean,
  routeCoordinates: LngLat[] | undefined,
  vehiclePosition: LngLat,
  isDrivenPath = false,
): UseRouteLayerReturn {
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const layersAddedRef = useRef(false);

  // Stabilize routeCoordinates: if the actual coordinates haven't changed
  // (same length and same values), keep the previous reference to avoid
  // unnecessary effect re-runs. WebSocket merged state creates a new array
  // reference on every tick even when the route is identical.
  const stableRouteRef = useRef<LngLat[] | undefined>(undefined);
  const prevRouteJsonRef = useRef<string>('');

  const routeJson = routeCoordinates ? JSON.stringify(routeCoordinates) : '';
  if (routeJson !== prevRouteJsonRef.current) {
    stableRouteRef.current = routeCoordinates;
    prevRouteJsonRef.current = routeJson;
  }
  const stableRoute = stableRouteRef.current;

  // Track the closest waypoint index so we only call setData when it changes.
  const lastWaypointIndexRef = useRef(-1);

  // Remaining route exposed to consumers (e.g. useMapFollow route-overview).
  // Uses useState so changes propagate to dependent hooks.
  const [remainingRoute, setRemainingRoute] = useState<LngLat[] | undefined>(undefined);

  // ── Set up layers once when route first appears ────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    if (!showRoute || !stableRoute || stableRoute.length < 2) {
      cleanup(m, startMarkerRef, endMarkerRef);
      layersAddedRef.current = false;
      lastWaypointIndexRef.current = -1;
      setRemainingRoute(undefined);
      return;
    }

    const setup = () => {
      try {
        // ── Completed layer ───────────────────────────────────────────
        // For a driven GPS path: bright gold (single-layer rendering).
        // For a nav route: dim gold (two-layer dim/bright split).
        const completedColor = isDrivenPath ? GOLD_BRIGHT : GOLD_DIM;

        if (!m.getSource(COMPLETED_SOURCE)) {
          m.addSource(COMPLETED_SOURCE, {
            type: 'geojson',
            data: lineFeature(stableRoute),
          });
        } else {
          (m.getSource(COMPLETED_SOURCE) as mapboxgl.GeoJSONSource)
            .setData(lineFeature(stableRoute));
        }
        if (!m.getLayer(COMPLETED_LAYER)) {
          m.addLayer({
            id: COMPLETED_LAYER,
            type: 'line',
            source: COMPLETED_SOURCE,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': completedColor,
              'line-width': 4,
            },
          });
        } else {
          m.setPaintProperty(COMPLETED_LAYER, 'line-color', completedColor);
        }

        // ── Remaining layer (from vehicle onward, bright) ──────────────
        // Only used for nav routes. For driven paths, show empty data.
        const remainingData = isDrivenPath ? EMPTY_LINE : lineFeature(stableRoute);

        if (!m.getSource(REMAINING_SOURCE)) {
          m.addSource(REMAINING_SOURCE, {
            type: 'geojson',
            data: remainingData,
          });
        } else {
          (m.getSource(REMAINING_SOURCE) as mapboxgl.GeoJSONSource)
            .setData(remainingData);
        }
        if (!m.getLayer(REMAINING_LAYER)) {
          m.addLayer({
            id: REMAINING_LAYER,
            type: 'line',
            source: REMAINING_SOURCE,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': GOLD_BRIGHT,
              'line-width': 4,
            },
          });
        }
      } catch (err) {
        console.error('[useRouteLayer] setup failed:', err);
      }

      layersAddedRef.current = true;
      lastWaypointIndexRef.current = -1;
      setRemainingRoute(isDrivenPath ? undefined : stableRoute);
      addEndpointMarkers(m, stableRoute, startMarkerRef, endMarkerRef);
    };

    if (m.isStyleLoaded()) {
      setup();
    } else {
      m.once('style.load', setup);
    }

    return () => {
      cleanup(m, startMarkerRef, endMarkerRef);
      layersAddedRef.current = false;
      lastWaypointIndexRef.current = -1;
    };
  }, [map, mapLoaded, showRoute, stableRoute, isDrivenPath]);

  // ── Update remaining layer when vehicle passes a new waypoint ──────────
  // Skipped for driven GPS paths — the entire route is already rendered as
  // a single bright line, and the "remaining" concept doesn't apply.
  useEffect(() => {
    if (isDrivenPath) return;

    const m = map.current;
    if (!m || !mapLoaded || !showRoute || !stableRoute || stableRoute.length < 2) {
      return;
    }
    if (!layersAddedRef.current) return;

    const closestIdx = findClosestWaypointIndex(stableRoute, vehiclePosition);

    // Only update the remaining route source when the waypoint index changes.
    // This means setData is called ~once every 30s on a highway route with
    // 1000+ points, instead of every 1s position tick. No flicker.
    if (closestIdx === lastWaypointIndexRef.current) return;
    lastWaypointIndexRef.current = closestIdx;

    // Build the remaining route: from the closest waypoint to the end.
    const remaining = stableRoute.slice(closestIdx);
    setRemainingRoute(remaining.length >= 2 ? remaining : undefined);

    const src = m.getSource(REMAINING_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData(
        remaining.length >= 2 ? lineFeature(remaining) : EMPTY_LINE,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapLoaded, showRoute, stableRoute, isDrivenPath, vehiclePosition[0], vehiclePosition[1]]);

  return { remainingRoute };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Find the index of the closest waypoint on the route to the vehicle. */
function findClosestWaypointIndex(route: LngLat[], vehiclePos: LngLat): number {
  let minDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = quickDistSq(route[i], vehiclePos);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }
  return closestIdx;
}

/** Fast approximate squared distance (squared degrees — fine for comparison). */
function quickDistSq(a: LngLat, b: LngLat): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** Add start (green) and end (gold) endpoint markers. */
function addEndpointMarkers(
  m: mapboxgl.Map,
  route: LngLat[],
  startRef: React.MutableRefObject<mapboxgl.Marker | null>,
  endRef: React.MutableRefObject<mapboxgl.Marker | null>,
): void {
  const startEl = document.createElement('div');
  startEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_START_MARKER_COLOR};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(48,209,88,0.5);`;
  startRef.current = new mapboxgl.Marker({ element: startEl })
    .setLngLat(route[0])
    .addTo(m);

  const endEl = document.createElement('div');
  endEl.style.cssText = `width:10px;height:10px;border-radius:50%;background:${MAPBOX_GOLD};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 6px rgba(201,168,76,0.5);`;
  endRef.current = new mapboxgl.Marker({ element: endEl })
    .setLngLat(route[route.length - 1])
    .addTo(m);
}

/** Remove route layers, sources, and markers. */
function cleanup(
  m: mapboxgl.Map,
  startRef: React.MutableRefObject<mapboxgl.Marker | null>,
  endRef: React.MutableRefObject<mapboxgl.Marker | null>,
): void {
  // Clean up two-layer approach
  for (const layerId of [COMPLETED_LAYER, REMAINING_LAYER]) {
    try { if (m.getLayer(layerId)) m.removeLayer(layerId); } catch { /* */ }
  }
  for (const sourceId of [COMPLETED_SOURCE, REMAINING_SOURCE]) {
    try { if (m.getSource(sourceId)) m.removeSource(sourceId); } catch { /* */ }
  }
  // Also clean up legacy single-layer approach if present
  try { if (m.getLayer('route-line')) m.removeLayer('route-line'); } catch { /* */ }
  try { if (m.getSource('route')) m.removeSource('route'); } catch { /* */ }
  // Clean up markers
  startRef.current?.remove();
  startRef.current = null;
  endRef.current?.remove();
  endRef.current = null;
}
