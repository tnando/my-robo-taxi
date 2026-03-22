'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

import type { LngLat } from '@/types/drive';
import { MAPBOX_GOLD } from '@/lib/mapbox';
import { shortestRotation } from '@/lib/map-math';

/** Duration of the position interpolation (ms). Matches the telemetry
 *  update interval so the marker glides continuously without pausing. */
const LERP_DURATION = 1000;

/**
 * Manages the gold pulsing vehicle marker on the map.
 * Smoothly interpolates between position updates using requestAnimationFrame
 * for fluid, continuous movement — no choppy jumps between ticks.
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

  // Animation state refs (avoid re-renders, survive across effect calls)
  const animFrameRef = useRef<number | null>(null);
  const fromPosRef = useRef<LngLat>(position);
  const toPosRef = useRef<LngLat>(position);
  const startTimeRef = useRef<number>(0);
  const fromHeadingRef = useRef<number>(heading);
  const toHeadingRef = useRef<number>(heading);

  // Create marker once
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
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(position)
        .addTo(m);
      fromPosRef.current = position;
      toPosRef.current = position;
    }
  }, [map, mapLoaded, showMarker]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate to new position on each update
  useEffect(() => {
    if (!markerRef.current) return;

    // Cancel any in-progress animation
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Set up interpolation from current rendered position to new target
    const currentLngLat = markerRef.current.getLngLat();
    fromPosRef.current = [currentLngLat.lng, currentLngLat.lat];
    toPosRef.current = position;
    fromHeadingRef.current = toHeadingRef.current;
    toHeadingRef.current = heading;
    startTimeRef.current = performance.now();

    function animate(now: number) {
      const elapsed = now - startTimeRef.current;
      // Linear progress 0→1 clamped
      const t = Math.min(elapsed / LERP_DURATION, 1);

      // Interpolate position
      const lng = fromPosRef.current[0] + (toPosRef.current[0] - fromPosRef.current[0]) * t;
      const lat = fromPosRef.current[1] + (toPosRef.current[1] - fromPosRef.current[1]) * t;
      markerRef.current?.setLngLat([lng, lat]);

      // Interpolate heading via shortest rotation path
      const targetH = shortestRotation(fromHeadingRef.current, toHeadingRef.current);
      const h = fromHeadingRef.current + (targetH - fromHeadingRef.current) * t;

      if (markerElRef.current) {
        const svg = markerElRef.current.querySelector('svg');
        if (svg) svg.style.transform = `rotate(${h}deg)`;
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        animFrameRef.current = null;
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [position, heading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      markerRef.current?.remove();
      markerRef.current = null;
      markerElRef.current = null;
    };
  }, []);
}
