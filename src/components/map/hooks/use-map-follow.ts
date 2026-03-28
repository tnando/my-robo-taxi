'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';
import {
  type MapMode,
  cycleMapMode,
  getCameraParams,
  getSpeedBasedZoom,
  haversineMeters,
  interpolateZoom,
} from '@/lib/map-math';

export type { MapMode };

// ── Timing constants ────────────────────────────────────────────────────────

const EASE_TO_DURATION = 1000;
const FLY_TO_DURATION = 1200;
const SNAP_BACK_DURATION = 1200;
const RECENTER_DURATION = 1000;
const SNAP_BACK_DELAY = 15_000;
const LARGE_JUMP_METERS = 500;

// ── Hook return type ────────────────────────────────────────────────────────

export interface UseMapFollowReturn {
  mapMode: MapMode;
  followMode: boolean;
  isDisabled: boolean;
  isOffCenter: boolean;
  cycleMode: () => void;
  recenter: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type GuardRef = React.MutableRefObject<boolean>;

/** Mark a programmatic move in progress and schedule its release. */
function withGuard(ref: GuardRef, ms: number, fn: () => void) {
  ref.current = true;
  fn();
  setTimeout(() => { ref.current = false; }, ms + 50);
}

/** Build camera params for a mode using current map state. */
function camFor(m: mapboxgl.Map, mode: MapMode, pos: LngLat, h: number, spd: number) {
  return getCameraParams(mode, {
    position: pos, heading: h, speedMph: spd,
    currentBearing: m.getBearing(),
    containerHeight: m.getContainer().clientHeight,
  });
}

/** flyTo with programmatic guard. */
function guardedFlyTo(m: mapboxgl.Map, ref: GuardRef, mode: MapMode,
  pos: LngLat, h: number, spd: number, duration: number) {
  withGuard(ref, duration, () => m.flyTo({ ...camFor(m, mode, pos, h, spd), duration }));
}

/** Fit the map to remaining route bounds (route-overview mode). */
function fitToRoute(
  m: mapboxgl.Map,
  route: LngLat[],
  pos: LngLat,
  ref: GuardRef,
  bottomPadding: number,
) {
  withGuard(ref, 1000, () => {
    import('mapbox-gl').then((mapboxgl) => {
      const bounds = new mapboxgl.default.LngLatBounds();
      route.forEach((c) => bounds.extend(c as [number, number]));
      bounds.extend(pos as [number, number]);
      m.fitBounds(bounds, {
        padding: { top: 80, bottom: bottomPadding, left: 60, right: 60 },
        bearing: 0, pitch: 0, maxZoom: 15, duration: 1000,
      });
    });
  });
}

/** Clear a snap-back timer if active. */
function clearSnapTimer(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (ref.current) { clearTimeout(ref.current); ref.current = null; }
}

// ── Main hook ───────────────────────────────────────────────────────────────

export function useMapFollow(
  map: React.RefObject<mapboxgl.Map | null>,
  mapLoaded: boolean,
  vehiclePosition: LngLat,
  heading: number = 0,
  speedMph: number = 0,
  hasActiveRoute: boolean = false,
  remainingRoute: LngLat[] | undefined = undefined,
  bottomPadding: number = 300,
): UseMapFollowReturn {
  const [mapMode, setMapMode] = useState<MapMode>('north-up');
  const [followMode, setFollowMode] = useState(true);
  const programmaticRef = useRef(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ mapMode, vehiclePosition, heading, speedMph });
  stateRef.current = { mapMode, vehiclePosition, heading, speedMph };

  // ── User gesture detection ──────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    function onMoveStart(e: { originalEvent?: MouseEvent | WheelEvent | TouchEvent }) {
      if (!e.originalEvent || programmaticRef.current) return;
      clearSnapTimer(snapTimerRef);
      setFollowMode(false);
      snapTimerRef.current = setTimeout(snapBack, SNAP_BACK_DELAY);
    }

    function snapBack() {
      const m2 = map.current;
      if (!m2) return;
      const { mapMode: mode, vehiclePosition: pos, heading: h, speedMph: spd } = stateRef.current;
      setFollowMode(true);
      guardedFlyTo(m2, programmaticRef, mode, pos, h, spd, SNAP_BACK_DURATION);
    }

    m.on('movestart', onMoveStart);
    m.on('dragstart', onMoveStart);
    return () => {
      m.off('movestart', onMoveStart);
      m.off('dragstart', onMoveStart);
      clearSnapTimer(snapTimerRef);
    };
  }, [map, mapLoaded]);

  // ── Follow mode: track vehicle on position/heading updates ──────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || !followMode) return;
    if (vehiclePosition[0] === 0 && vehiclePosition[1] === 0) return;

    if (mapMode === 'route-overview' && remainingRoute && remainingRoute.length >= 2) {
      fitToRoute(m, remainingRoute, vehiclePosition, programmaticRef, bottomPadding);
      return;
    }

    const currentCenter: LngLat = [m.getCenter().lng, m.getCenter().lat];
    const distance = haversineMeters(currentCenter, vehiclePosition);
    const zoom = interpolateZoom(m.getZoom(), getSpeedBasedZoom(speedMph));
    const cam = camFor(m, mapMode, vehiclePosition, heading, speedMph);

    if (distance > LARGE_JUMP_METERS) {
      withGuard(programmaticRef, FLY_TO_DURATION, () => {
        m.flyTo({ ...cam, zoom, duration: FLY_TO_DURATION });
      });
    } else {
      withGuard(programmaticRef, EASE_TO_DURATION, () => {
        m.easeTo({ ...cam, zoom, duration: EASE_TO_DURATION, easing: (t: number) => t });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapLoaded, followMode, mapMode, vehiclePosition[0], vehiclePosition[1], heading, speedMph]);

  // ── Cycle mode (compass button tap) ─────────────────────────────────────
  const cycleMode = useCallback(() => {
    const m = map.current;
    if (!m) return;

    if (!followMode) {
      clearSnapTimer(snapTimerRef);
      setFollowMode(true);
      guardedFlyTo(m, programmaticRef, mapMode, vehiclePosition, heading, speedMph, RECENTER_DURATION);
      return;
    }

    const nextMode = cycleMapMode(mapMode, hasActiveRoute, false);
    setMapMode(nextMode);

    if (nextMode === 'route-overview' && remainingRoute && remainingRoute.length >= 2) {
      fitToRoute(m, remainingRoute, vehiclePosition, programmaticRef, bottomPadding);
    } else {
      const cam = camFor(m, nextMode, vehiclePosition, heading, speedMph);
      withGuard(programmaticRef, EASE_TO_DURATION, () => {
        m.easeTo({ ...cam, duration: EASE_TO_DURATION });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapMode, followMode, hasActiveRoute, vehiclePosition[0], vehiclePosition[1], heading, speedMph, remainingRoute]);

  // ── Manual recenter ─────────────────────────────────────────────────────
  const recenter = useCallback(() => {
    const m = map.current;
    if (!m) return;
    clearSnapTimer(snapTimerRef);
    setFollowMode(true);
    guardedFlyTo(m, programmaticRef, mapMode, vehiclePosition, heading, speedMph, RECENTER_DURATION);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapMode, vehiclePosition[0], vehiclePosition[1], heading, speedMph]);

  const isDisabled = !followMode;
  return { mapMode, followMode, isDisabled, isOffCenter: isDisabled, cycleMode, recenter };
}
