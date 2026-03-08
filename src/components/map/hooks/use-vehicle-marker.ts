'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';
import { MAPBOX_GOLD } from '@/lib/mapbox';

/**
 * Manages the gold pulsing vehicle marker on the map.
 * Creates the marker element once, then updates position and heading.
 */
export function useVehicleMarker(
  map: React.RefObject<mapboxgl.Map | null>,
  mapLoaded: boolean,
  showMarker: boolean,
  position: LngLat,
  heading: number,
): void {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);

  // Create or update marker position
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || !showMarker) return;

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
      markerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(position).addTo(m);
    } else {
      markerRef.current?.setLngLat(position);
    }
  }, [map, showMarker, position, heading, mapLoaded]);

  // Update heading rotation via direct DOM manipulation
  useEffect(() => {
    if (!markerElRef.current) return;
    const svg = markerElRef.current.querySelector('svg');
    if (svg) svg.style.transform = `rotate(${heading}deg)`;
  }, [heading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      markerElRef.current = null;
    };
  }, []);
}
