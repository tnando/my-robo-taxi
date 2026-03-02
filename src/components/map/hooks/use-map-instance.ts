'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';
import { MAPBOX_TOKEN, MAPBOX_STYLE } from '@/lib/mapbox';

mapboxgl.accessToken = MAPBOX_TOKEN;

/** Return type of the useMapInstance hook. */
export interface UseMapInstanceReturn {
  /** Ref to attach to the map container div. */
  mapContainer: React.RefObject<HTMLDivElement | null>;
  /** The Mapbox map instance (null before initialization). */
  map: React.RefObject<mapboxgl.Map | null>;
  /** Whether the map has finished loading — MUST be useState for effect deps. */
  mapLoaded: boolean;
}

/**
 * Creates and manages a Mapbox GL map instance lifecycle.
 * Returns the container ref, map ref, and load state.
 */
export function useMapInstance(
  center: LngLat,
  zoom: number,
  interactive: boolean,
): UseMapInstanceReturn {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { mapContainer, map, mapLoaded };
}
