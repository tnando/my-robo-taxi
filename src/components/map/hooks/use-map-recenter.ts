'use client';

import { useCallback, useEffect, useState } from 'react';
import type mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';

/** Distance threshold in degrees — roughly 1km at mid-latitudes. */
const OFF_CENTER_THRESHOLD = 0.01;

/** Return type of the useMapRecenter hook. */
export interface UseMapRecenterReturn {
  /** Whether the map center is far enough from the vehicle to show the button. */
  isOffCenter: boolean;
  /** Fly the map back to the vehicle position. */
  recenter: () => void;
}

/**
 * Tracks whether the map center has drifted from the vehicle position
 * and provides a flyTo recenter function.
 */
export function useMapRecenter(
  map: React.RefObject<mapboxgl.Map | null>,
  mapLoaded: boolean,
  vehicleCenter: LngLat,
): UseMapRecenterReturn {
  const [isOffCenter, setIsOffCenter] = useState(false);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    function checkCenter() {
      const m = map.current;
      if (!m) return;
      const { lng, lat } = m.getCenter();
      const dist = Math.hypot(lng - vehicleCenter[0], lat - vehicleCenter[1]);
      setIsOffCenter(dist > OFF_CENTER_THRESHOLD);
    }

    // Check immediately (handles vehicle switching)
    checkCenter();

    m.on('moveend', checkCenter);
    return () => {
      m.off('moveend', checkCenter);
    };
  }, [map, mapLoaded, vehicleCenter[0], vehicleCenter[1]]);

  const recenter = useCallback(() => {
    map.current?.flyTo({ center: vehicleCenter, duration: 1000 });
  }, [map, vehicleCenter[0], vehicleCenter[1]]);

  return { isOffCenter, recenter };
}
