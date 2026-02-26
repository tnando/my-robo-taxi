/**
 * Route geometry utilities for map rendering.
 * Splits a route into completed and remaining segments based on vehicle position.
 */

import type { LngLat } from '@/types/drive';

/** Squared distance between two points (avoids sqrt for comparison). */
function distSq(a: LngLat, b: LngLat): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

/** Splits a route into completed (dim) and remaining (bright) segments. */
export function splitRoute(
  coords: LngLat[],
  vehiclePos: LngLat,
): { completed: LngLat[]; remaining: LngLat[] } {
  let closestIdx = 0;
  let closestDist = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const d = distSq(coords[i], vehiclePos);
    if (d < closestDist) {
      closestDist = d;
      closestIdx = i;
    }
  }

  return {
    completed: coords.slice(0, closestIdx + 1),
    remaining: coords.slice(closestIdx),
  };
}
