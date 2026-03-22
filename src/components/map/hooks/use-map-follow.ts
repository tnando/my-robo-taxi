'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';

// ── Map mode types ──────────────────────────────────────────────────────────

/** Selectable map tracking modes (excludes the implicit free/disabled state). */
export type MapMode = 'north-up' | 'heading-up' | 'route-overview';

// ── Timing constants ────────────────────────────────────────────────────────

/** Duration (ms) for smooth tracking via easeTo. Matches the telemetry
 *  update interval (1s) so the animation completes just as the next
 *  position arrives, creating continuous fluid movement like Tesla's map. */
const EASE_TO_DURATION = 1000;

/** Duration (ms) for large jumps via flyTo (>500m). */
const FLY_TO_DURATION = 1200;

/** Duration (ms) for the animated snap-back after free-mode timeout. */
const SNAP_BACK_DURATION = 1200;

/** Duration (ms) for manual recenter animation. */
const RECENTER_DURATION = 1000;

/** Idle timeout (ms) before auto-snapping back from free mode. */
const SNAP_BACK_DELAY = 15_000;

/** Distance threshold (meters) above which we use flyTo instead of easeTo. */
const LARGE_JUMP_METERS = 500;

// ── Speed-based zoom ────────────────────────────────────────────────────────

/** Returns the target zoom level based on vehicle speed in mph. */
function getSpeedBasedZoom(speedMph: number): number {
  if (speedMph <= 5) return 17;
  if (speedMph <= 15) return 16;
  if (speedMph <= 25) return 15;
  if (speedMph <= 35) return 14.5;
  if (speedMph <= 45) return 14;
  if (speedMph <= 55) return 13;
  if (speedMph <= 65) return 12.5;
  return 12;
}

/** Smoothly interpolate between current and target zoom (avoids jarring jumps). */
function interpolateZoom(current: number, target: number, factor = 0.15): number {
  return current + (target - current) * factor;
}

// ── Bearing math ────────────────────────────────────────────────────────────

/** Computes shortest rotation path between two bearings. */
function shortestRotation(from: number, to: number): number {
  let diff = ((to - from + 540) % 360) - 180;
  return from + diff;
}

// ── Distance calculation ────────────────────────────────────────────────────

/** Haversine distance between two LngLat points, in meters. */
function haversineMeters(a: LngLat, b: LngLat): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ── Mode cycling logic ──────────────────────────────────────────────────────

/**
 * Determines the next mode when the compass button is tapped.
 * From disabled (free mode): first tap recenters without cycling.
 */
function cycleMapMode(
  current: MapMode,
  hasActiveRoute: boolean,
  isDisabled: boolean,
): MapMode {
  if (isDisabled) return current;
  if (current === 'north-up') return 'heading-up';
  if (current === 'heading-up') return hasActiveRoute ? 'route-overview' : 'north-up';
  if (current === 'route-overview') return 'north-up';
  return 'north-up';
}

// ── Hook return type ────────────────────────────────────────────────────────

/** Return type of the useMapFollow hook. */
export interface UseMapFollowReturn {
  /** Current selectable map mode. */
  mapMode: MapMode;
  /** Whether the map is actively tracking the vehicle (false in free/disabled mode). */
  followMode: boolean;
  /** Whether the map is in free/disabled mode (user panned away). */
  isDisabled: boolean;
  /** Legacy alias: true when not following. */
  isOffCenter: boolean;
  /** Cycle to the next map mode (or recenter if disabled). */
  cycleMode: () => void;
  /** Manually recenter and re-enter tracking. */
  recenter: () => void;
}

// ── Main hook ───────────────────────────────────────────────────────────────

/**
 * Tesla-like map follow behavior with three tracking modes + free/disabled state.
 *
 * - **North-Up:** bearing 0, pitch 0, vehicle centered, speed-based zoom.
 * - **Heading-Up:** bearing = vehicle heading, pitch 50, vehicle in lower third.
 * - **Route Overview:** fitBounds to remaining route.
 * - **Free/Disabled:** entered on user gesture, 15s snap-back timer.
 */
export function useMapFollow(
  map: React.RefObject<mapboxgl.Map | null>,
  mapLoaded: boolean,
  vehiclePosition: LngLat,
  heading: number = 0,
  speedMph: number = 0,
  hasActiveRoute: boolean = false,
  remainingRoute: LngLat[] | undefined = undefined,
): UseMapFollowReturn {
  const [mapMode, setMapMode] = useState<MapMode>('north-up');
  const [followMode, setFollowMode] = useState(true);

  // Track whether a programmatic move is in progress to avoid
  // interpreting our own animations as user gestures.
  const programmaticRef = useRef(false);

  // Snap-back timer ref
  const snapBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref for current values used in callbacks to avoid stale closures
  const stateRef = useRef({ mapMode, vehiclePosition, heading, speedMph });
  stateRef.current = { mapMode, vehiclePosition, heading, speedMph };

  // ── User gesture detection ──────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    function onMoveStart(e: { originalEvent?: MouseEvent | WheelEvent | TouchEvent }) {
      // Only user-initiated events have originalEvent
      if (!e.originalEvent) return;
      // Ignore events triggered by our own programmatic moves
      if (programmaticRef.current) return;
      enterFreeMode();
    }

    function enterFreeMode() {
      // Clear any existing snap-back timer
      if (snapBackTimerRef.current) {
        clearTimeout(snapBackTimerRef.current);
      }
      setFollowMode(false);

      // Start the snap-back timer
      snapBackTimerRef.current = setTimeout(() => {
        snapBack();
      }, SNAP_BACK_DELAY);
    }

    function snapBack() {
      const m2 = map.current;
      if (!m2) return;
      const { mapMode: mode, vehiclePosition: pos, heading: h, speedMph: spd } = stateRef.current;

      programmaticRef.current = true;
      setFollowMode(true);

      if (mode === 'heading-up') {
        m2.flyTo({
          center: pos,
          bearing: shortestRotation(m2.getBearing(), -h),
          pitch: 50,
          zoom: getSpeedBasedZoom(spd),
          duration: SNAP_BACK_DURATION,
          offset: [0, m2.getContainer().clientHeight * 0.15],
        });
      } else {
        m2.flyTo({
          center: pos,
          bearing: 0,
          pitch: 0,
          zoom: getSpeedBasedZoom(spd),
          duration: SNAP_BACK_DURATION,
        });
      }

      setTimeout(() => {
        programmaticRef.current = false;
      }, SNAP_BACK_DURATION + 50);
    }

    m.on('movestart', onMoveStart);
    m.on('dragstart', onMoveStart);

    return () => {
      m.off('movestart', onMoveStart);
      m.off('dragstart', onMoveStart);
      if (snapBackTimerRef.current) {
        clearTimeout(snapBackTimerRef.current);
      }
    };
  }, [map, mapLoaded]);

  // ── Follow mode: track vehicle on position/heading updates ──────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || !followMode) return;

    // Skip 0,0 coordinates (vehicle asleep/offline)
    if (vehiclePosition[0] === 0 && vehiclePosition[1] === 0) return;

    // Route overview mode: fitBounds instead of tracking
    if (mapMode === 'route-overview' && remainingRoute && remainingRoute.length >= 2) {
      // Dynamically import mapboxgl for LngLatBounds — we need the constructor.
      // Since mapboxgl is already loaded by the map instance, we access it via
      // the global that Mapbox GL JS sets.
      programmaticRef.current = true;
      import('mapbox-gl').then((mapboxgl) => {
        const bounds = new mapboxgl.default.LngLatBounds();
        remainingRoute.forEach((c) => bounds.extend(c as [number, number]));
        bounds.extend(vehiclePosition as [number, number]);
        m.fitBounds(bounds, {
          padding: { top: 80, bottom: 300, left: 60, right: 60 },
          bearing: 0,
          pitch: 0,
          maxZoom: 15,
          duration: 1000,
        });
        setTimeout(() => {
          programmaticRef.current = false;
        }, 1050);
      });
      return;
    }

    const currentCenter: LngLat = [m.getCenter().lng, m.getCenter().lat];
    const distance = haversineMeters(currentCenter, vehiclePosition);

    programmaticRef.current = true;

    const currentZoom = m.getZoom();
    const targetZoom = getSpeedBasedZoom(speedMph);
    const zoom = interpolateZoom(currentZoom, targetZoom);

    if (distance > LARGE_JUMP_METERS) {
      // Large jump — use flyTo
      m.flyTo({
        center: vehiclePosition,
        bearing: mapMode === 'heading-up' ? shortestRotation(m.getBearing(), -heading) : 0,
        pitch: mapMode === 'heading-up' ? 50 : 0,
        zoom,
        duration: FLY_TO_DURATION,
        ...(mapMode === 'heading-up' ? { offset: [0, m.getContainer().clientHeight * 0.15] as [number, number] } : {}),
      });
      setTimeout(() => {
        programmaticRef.current = false;
      }, FLY_TO_DURATION + 50);
    } else {
      // Normal tracking — smooth easeTo
      m.easeTo({
        center: vehiclePosition,
        bearing: mapMode === 'heading-up' ? shortestRotation(m.getBearing(), -heading) : 0,
        pitch: mapMode === 'heading-up' ? 50 : 0,
        zoom,
        duration: EASE_TO_DURATION,
        easing: (t: number) => t, // linear — constant speed for fluid continuous movement
        ...(mapMode === 'heading-up' ? { offset: [0, m.getContainer().clientHeight * 0.15] as [number, number] } : {}),
      });
      setTimeout(() => {
        programmaticRef.current = false;
      }, EASE_TO_DURATION + 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapLoaded, followMode, mapMode, vehiclePosition[0], vehiclePosition[1], heading, speedMph]);

  // ── Cycle mode (compass button tap) ─────────────────────────────────────
  const cycleMode = useCallback(() => {
    const m = map.current;
    if (!m) return;

    const isDisabled = !followMode;

    if (isDisabled) {
      // First tap from disabled: recenter to current mode, don't cycle
      if (snapBackTimerRef.current) {
        clearTimeout(snapBackTimerRef.current);
        snapBackTimerRef.current = null;
      }
      programmaticRef.current = true;
      setFollowMode(true);

      if (mapMode === 'heading-up') {
        m.flyTo({
          center: vehiclePosition,
          bearing: -heading,
          pitch: 50,
          zoom: getSpeedBasedZoom(speedMph),
          duration: RECENTER_DURATION,
          offset: [0, m.getContainer().clientHeight * 0.15],
        });
      } else {
        m.flyTo({
          center: vehiclePosition,
          bearing: 0,
          pitch: 0,
          zoom: getSpeedBasedZoom(speedMph),
          duration: RECENTER_DURATION,
        });
      }

      setTimeout(() => {
        programmaticRef.current = false;
      }, RECENTER_DURATION + 50);
      return;
    }

    // Active mode: cycle to next
    const nextMode = cycleMapMode(mapMode, hasActiveRoute, false);
    setMapMode(nextMode);

    programmaticRef.current = true;

    if (nextMode === 'heading-up') {
      m.easeTo({
        center: vehiclePosition,
        bearing: -heading,
        pitch: 50,
        zoom: getSpeedBasedZoom(speedMph),
        duration: EASE_TO_DURATION,
        offset: [0, m.getContainer().clientHeight * 0.15],
      });
    } else if (nextMode === 'route-overview' && remainingRoute && remainingRoute.length >= 2) {
      import('mapbox-gl').then((mapboxgl) => {
        const bounds = new mapboxgl.default.LngLatBounds();
        remainingRoute.forEach((c) => bounds.extend(c as [number, number]));
        bounds.extend(vehiclePosition as [number, number]);
        m.fitBounds(bounds, {
          padding: { top: 80, bottom: 300, left: 60, right: 60 },
          bearing: 0,
          pitch: 0,
          maxZoom: 15,
          duration: 1000,
        });
      });
    } else {
      // north-up
      m.easeTo({
        center: vehiclePosition,
        bearing: 0,
        pitch: 0,
        zoom: getSpeedBasedZoom(speedMph),
        duration: EASE_TO_DURATION,
      });
    }

    setTimeout(() => {
      programmaticRef.current = false;
    }, EASE_TO_DURATION + 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapMode, followMode, hasActiveRoute, vehiclePosition[0], vehiclePosition[1], heading, speedMph, remainingRoute]);

  // ── Manual recenter ─────────────────────────────────────────────────────
  const recenter = useCallback(() => {
    const m = map.current;
    if (!m) return;

    if (snapBackTimerRef.current) {
      clearTimeout(snapBackTimerRef.current);
      snapBackTimerRef.current = null;
    }

    programmaticRef.current = true;
    setFollowMode(true);

    if (mapMode === 'heading-up') {
      m.flyTo({
        center: vehiclePosition,
        bearing: -heading,
        pitch: 50,
        zoom: getSpeedBasedZoom(speedMph),
        duration: RECENTER_DURATION,
        offset: [0, m.getContainer().clientHeight * 0.15],
      });
    } else {
      m.flyTo({
        center: vehiclePosition,
        bearing: 0,
        pitch: 0,
        zoom: getSpeedBasedZoom(speedMph),
        duration: RECENTER_DURATION,
      });
    }

    setTimeout(() => {
      programmaticRef.current = false;
    }, RECENTER_DURATION + 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapMode, vehiclePosition[0], vehiclePosition[1], heading, speedMph]);

  const isDisabled = !followMode;

  return {
    mapMode,
    followMode,
    isDisabled,
    isOffCenter: isDisabled,
    cycleMode,
    recenter,
  };
}
