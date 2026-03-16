'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import type { Vehicle } from '@/types/vehicle';

const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_MAX_POLL_DURATION_MS = 15_000;

export interface VehiclePollingResult {
  /** Vehicles found so far (empty until sync completes). */
  vehicles: Vehicle[];
  /** Whether polling is still in progress. */
  isPolling: boolean;
  /** Whether polling timed out without finding vehicles. */
  timedOut: boolean;
}

export interface VehiclePollingOptions {
  /** Interval between polls in ms. Defaults to 3000. */
  intervalMs?: number;
  /** Max polling duration in ms before timing out. Defaults to 15000. */
  maxDurationMs?: number;
}

/**
 * Polls for vehicles by calling a fetch function at regular intervals.
 * Stops when vehicles are found or the timeout is reached.
 * Used after Tesla OAuth redirect to wait for the background sync to complete.
 */
export function useVehiclePolling(
  fetchVehicles: () => Promise<Vehicle[]>,
  enabled: boolean,
  options?: VehiclePollingOptions,
): VehiclePollingResult {
  const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxDurationMs = options?.maxDurationMs ?? DEFAULT_MAX_POLL_DURATION_MS;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isPolling, setIsPolling] = useState(enabled);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const result = await fetchVehicles();
        if (result.length > 0) {
          setVehicles(result);
          setIsPolling(false);
          cleanup();
        }
      } catch {
        // Silently retry on next interval
      }
    };

    // Poll immediately on mount
    poll();

    // Set up interval polling
    intervalRef.current = setInterval(poll, intervalMs);

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      setIsPolling(false);
      setTimedOut(true);
      cleanup();
    }, maxDurationMs);

    return cleanup;
    // Only run on mount — fetchVehicles is a stable server action reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { vehicles, isPolling, timedOut };
}
