import type { LngLat } from '@/types/drive';

/**
 * A route point as stored in the database by drive-detection.
 * Differs from LngLat — this has lat/lng as object properties.
 */
export interface StoredRoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
}

/** Type guard: is this a stored RoutePoint object (from drive-detection)? */
export function isStoredRoutePoint(p: unknown): p is StoredRoutePoint {
  return (
    typeof p === 'object' &&
    p !== null &&
    'lat' in p &&
    'lng' in p &&
    typeof (p as StoredRoutePoint).lat === 'number' &&
    typeof (p as StoredRoutePoint).lng === 'number'
  );
}

/**
 * Convert stored route points to LngLat tuples.
 * Handles both formats: RoutePoint objects (from drive-detection) and
 * LngLat tuples (from mock data).
 */
export function normalizeRoutePoints(raw: unknown): LngLat[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p: unknown) => {
      if (isStoredRoutePoint(p)) return [p.lng, p.lat] as LngLat;
      if (Array.isArray(p) && p.length === 2) return p as LngLat;
      return null;
    })
    .filter((p): p is LngLat => p !== null);
}
