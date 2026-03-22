'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';

/** Street-level zoom used when following the vehicle. */
const FOLLOW_ZOOM = 15;

/** Duration in ms for the flyTo animation when tracking the vehicle. */
const FLY_TO_DURATION = 800;

/** Duration in ms for the flyTo animation when re-centering. */
const RECENTER_DURATION = 1000;

/** Return type of the useMapFollow hook. */
export interface UseMapFollowReturn {
  /** Whether the map is not following the vehicle (user panned/zoomed away). */
  isOffCenter: boolean;
  /** Whether the map is actively tracking the vehicle position. */
  followMode: boolean;
  /** Re-enter follow mode and fly to the vehicle position. */
  recenter: () => void;
}

/**
 * Tesla-like map follow/free interaction mode.
 *
 * **Follow mode (default):** Map smoothly tracks the vehicle via `flyTo` at
 * street-level zoom. Centered on the vehicle position.
 *
 * **Free mode (user-initiated):** Entered when the user pans, zooms, pinches,
 * or rotates the map. Auto-tracking is suppressed and the recenter button
 * becomes visible.
 *
 * **Re-center:** Calling `recenter()` returns to follow mode and flies to the
 * current vehicle position.
 */
export function useMapFollow(
  map: React.RefObject<mapboxgl.Map | null>,
  mapLoaded: boolean,
  vehiclePosition: LngLat,
): UseMapFollowReturn {
  const [followMode, setFollowMode] = useState(true);

  // Track whether a programmatic flyTo is in progress so we don't
  // interpret the resulting map events as user gestures.
  const programmaticMoveRef = useRef(false);

  // ── Listen for user gestures to exit follow mode ──────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    function onUserGesture() {
      // Ignore events triggered by our own flyTo calls
      if (programmaticMoveRef.current) return;
      setFollowMode(false);
    }

    m.on('dragstart', onUserGesture);
    m.on('zoomstart', onUserGesture);
    m.on('pitchstart', onUserGesture);
    m.on('rotatestart', onUserGesture);

    return () => {
      m.off('dragstart', onUserGesture);
      m.off('zoomstart', onUserGesture);
      m.off('pitchstart', onUserGesture);
      m.off('rotatestart', onUserGesture);
    };
  }, [map, mapLoaded]);

  // ── Follow mode: flyTo on every vehicle position update ───────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || !followMode) return;

    // Skip 0,0 coordinates (vehicle asleep/offline)
    if (vehiclePosition[0] === 0 && vehiclePosition[1] === 0) return;

    programmaticMoveRef.current = true;

    m.flyTo({
      center: vehiclePosition,
      zoom: FOLLOW_ZOOM,
      duration: FLY_TO_DURATION,
    });

    // Clear the programmatic flag after the animation completes
    const timer = setTimeout(() => {
      programmaticMoveRef.current = false;
    }, FLY_TO_DURATION + 50);

    return () => {
      clearTimeout(timer);
      programmaticMoveRef.current = false;
    };
  }, [map, mapLoaded, followMode, vehiclePosition[0], vehiclePosition[1]]);

  // ── Recenter: re-enter follow mode ────────────────────────────────────
  const recenter = useCallback(() => {
    const m = map.current;
    if (!m) return;

    programmaticMoveRef.current = true;
    setFollowMode(true);

    m.flyTo({
      center: vehiclePosition,
      zoom: FOLLOW_ZOOM,
      duration: RECENTER_DURATION,
    });

    setTimeout(() => {
      programmaticMoveRef.current = false;
    }, RECENTER_DURATION + 50);
  }, [map, vehiclePosition[0], vehiclePosition[1]]);

  return {
    isOffCenter: !followMode,
    followMode,
    recenter,
  };
}
