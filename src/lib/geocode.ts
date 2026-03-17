/**
 * Reverse geocoding via Mapbox Geocoding API.
 * Server-side only — called from drive-detection.ts during sync.
 */

import { MAPBOX_TOKEN } from '@/lib/mapbox';

/** Result of a reverse geocode lookup. */
export interface GeocodeResult {
  /** Place name (e.g., "Thompson Hotel") or short address. */
  placeName: string;
  /** Full address (e.g., "506 San Jacinto Blvd, Austin, TX 78701"). */
  address: string;
}

/**
 * Reverse geocode a lat/lng coordinate pair via the Mapbox Geocoding API.
 * Returns a place name and address, or null if the lookup fails.
 *
 * Falls back gracefully on any error (network, rate limit, missing token)
 * so callers can continue with raw coordinates.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodeResult | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=poi,address`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      console.warn(`[geocode] Mapbox returned ${res.status} for ${lat},${lng}`);
      return null;
    }

    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;

    // feature.text = short name (e.g., "Thompson Hotel")
    // feature.place_name = full address (e.g., "Thompson Hotel, 506 San Jacinto Blvd, Austin, TX 78701")
    return {
      placeName: feature.text ?? '',
      address: feature.place_name ?? '',
    };
  } catch (err) {
    console.warn(`[geocode] Reverse geocode failed for ${lat},${lng}:`, err);
    return null;
  }
}
