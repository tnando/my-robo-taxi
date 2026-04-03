'use client';

import { useEffect, useRef, useState } from 'react';

/** Failsafe timeout (ms) — clears skeleton if nav text fields never arrive. */
const FAILSAFE_TIMEOUT_MS = 10_000;

/** Nav text field names that signal the skeleton can be cleared. */
const NAV_TEXT_FIELDS = ['destinationName', 'etaMinutes'];

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
 * - `lastUpdateFields` includes `destinationName` or `etaMinutes` (field-aware), OR
 * - `destinationName` or `etaMinutes` VALUES change (same-message delivery fallback), OR
 * - A 10s failsafe timeout expires (handles extreme edge cases)
 *
 * @param navRouteCoordinates — Current route polyline from vehicle state
 * @param destinationName — Current destination name from vehicle state
 * @param etaMinutes — Current ETA in minutes from vehicle state
 * @param lastUpdateFields — Field names from the most recent WebSocket update
 */
export function useRouteTransition(
  navRouteCoordinates: [number, number][] | undefined,
  destinationName: string | undefined,
  etaMinutes: number | undefined,
  lastUpdateFields: string[],
): { isRouteTransitioning: boolean } {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track previous fingerprints and stale values for comparison
  const prevRouteRef = useRef<string | null>(null);
  const staleDestRef = useRef<string | undefined>(undefined);
  const staleEtaRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flag to skip the first render's lastUpdateFields after a route change,
  // since that render carries the route change itself, not the nav text update.
  const watchingRef = useRef(false);

  const currentFingerprint = routeFingerprint(navRouteCoordinates);

  // Detect route fingerprint changes — start transitioning
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
      watchingRef.current = false; // Don't check this render's fields
      prevRouteRef.current = currentFingerprint;

      // Start failsafe timeout (10s) — clears skeleton even if nav text never arrives
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, FAILSAFE_TIMEOUT_MS);
    }
  }, [currentFingerprint, destinationName, etaMinutes]);

  // Watch for nav text fields in subsequent WebSocket updates
  useEffect(() => {
    if (!isTransitioning) {
      watchingRef.current = false;
      return;
    }

    // Skip the first render after route change (it carries the route update's fields)
    if (!watchingRef.current) {
      watchingRef.current = true;
      return;
    }

    // Check if nav text fields arrived in this update
    const hasNavText = lastUpdateFields.some((f) => NAV_TEXT_FIELDS.includes(f));
    if (hasNavText) {
      setIsTransitioning(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isTransitioning, lastUpdateFields]);

  // Also clear on value changes (handles same-message delivery where
  // nav text arrives in the same WebSocket message as coordinates)
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
