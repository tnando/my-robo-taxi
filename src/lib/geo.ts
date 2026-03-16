/**
 * Geographic utility functions.
 * Pure math — no side effects, no database access, no React.
 */

/** A single point along a drive route, stored in Drive.routePoints JSON. */
export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
}

/**
 * Calculate distance in miles between two lat/lng points using the Haversine formula.
 */
export function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance from an array of route points using Haversine.
 */
export function totalDistanceFromRoutePoints(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistanceMiles(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng,
    );
  }
  return total;
}
