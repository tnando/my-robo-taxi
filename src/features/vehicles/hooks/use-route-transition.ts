'use client';

import { useEffect, useRef, useState } from 'react';

/** Timeout (ms) before the transitioning state auto-clears. */
const TRANSITION_TIMEOUT_MS = 2000;

/**
 * Fingerprint a route polyline by its length, first, and last coordinate.
 * Returns null for empty/undefined routes.
 */
function routeFingerprint(coords: [number, number][] | undefined): string | null {
  if (!coords || coords.length < 2) return null;
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${coords.length}:${first[0].toFixed(4)},${first[1].toFixed(4)}:${last[0].toFixed(4)},${last[1].toFixed(4)}`;
}

/**
 * Detects route polyline changes and provides a loading signal for related UI fields.
 *
 * When `navRouteCoordinates` changes significantly (different fingerprint),
 * `isRouteTransitioning` becomes true. It clears when:
 * - `destinationName` or `etaMinutes` change (the fields caught up), OR
 * - A timeout expires (handles same-destination reroutes where text stays the same)
 *
 * @param navRouteCoordinates — Current route polyline from vehicle state
 * @param destinationName — Current destination name from vehicle state
 * @param etaMinutes — Current ETA in minutes from vehicle state
 */
export function useRouteTransition(
  navRouteCoordinates: [number, number][] | undefined,
  destinationName: string | undefined,
  etaMinutes: number | undefined,
): { isRouteTransitioning: boolean } {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track previous fingerprints to detect changes
  const prevRouteRef = useRef<string | null>(null);
  const staleDestRef = useRef<string | undefined>(undefined);
  const staleEtaRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect route fingerprint changes
  const currentFingerprint = routeFingerprint(navRouteCoordinates);

  useEffect(() => {
    // Skip initial mount — no transition on first render
    if (prevRouteRef.current === null) {
      prevRouteRef.current = currentFingerprint;
      return;
    }

    if (currentFingerprint !== prevRouteRef.current) {
      // Route changed — capture stale values and start transitioning
      staleDestRef.current = destinationName;
      staleEtaRef.current = etaMinutes;
      setIsTransitioning(true);
      prevRouteRef.current = currentFingerprint;

      // Auto-clear after timeout (handles same-destination reroutes)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, TRANSITION_TIMEOUT_MS);
    }
  }, [currentFingerprint, destinationName, etaMinutes]);

  // Clear transition when destination or ETA actually update
  useEffect(() => {
    if (!isTransitioning) return;

    const destChanged = destinationName !== staleDestRef.current;
    const etaChanged = etaMinutes !== staleEtaRef.current;

    if (destChanged || etaChanged) {
      setIsTransitioning(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isTransitioning, destinationName, etaMinutes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isRouteTransitioning: isTransitioning };
}
