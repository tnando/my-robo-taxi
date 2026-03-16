/**
 * Formatting utilities for dates, distances, speeds, and durations.
 * Uses Intl APIs for zero-bundle-cost formatting. No external date libraries.
 */

/**
 * Returns a human-readable date label: "Today", "Yesterday", or a formatted date.
 * @param dateString - ISO date string (e.g., "2026-02-22")
 */
export function formatDateLabel(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Formats a duration in minutes to a human-readable string.
 * @param minutes - Duration in minutes
 * @returns e.g., "1h 15m" or "35m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

/**
 * Formats a distance in miles with one decimal place.
 * @param miles - Distance in miles
 * @returns e.g., "14.2 mi"
 */
export function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}

/**
 * Formats a speed value in mph.
 * @param mph - Speed in miles per hour
 * @returns e.g., "65 mph"
 */
export function formatSpeed(mph: number): string {
  return `${Math.round(mph)} mph`;
}

/**
 * Formats a battery percentage.
 * @param level - Battery level 0-100
 * @returns e.g., "78%"
 */
export function formatBatteryLevel(level: number): string {
  return `${Math.round(level)}%`;
}

/**
 * Formats an ETA in minutes.
 * @param minutes - ETA in minutes
 * @returns e.g., "23 min"
 */
export function formatEta(minutes: number): string {
  return `${Math.round(minutes)} min`;
}

/**
 * Formats a temperature in Fahrenheit.
 * @param temp - Temperature in Fahrenheit
 * @returns e.g., "72°F"
 */
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°F`;
}

/**
 * Formats an odometer reading with locale-aware thousand separators.
 * @param miles - Odometer reading in miles
 * @returns e.g., "12,847 mi"
 */
export function formatOdometer(miles: number): string {
  return `${new Intl.NumberFormat('en-US').format(Math.round(miles))} mi`;
}

/**
 * Formats energy usage in kWh.
 * @param kwh - Energy in kilowatt-hours
 * @returns e.g., "4.8 kWh"
 */
export function formatEnergy(kwh: number): string {
  return `${kwh.toFixed(1)} kWh`;
}

/**
 * Formats an ISO timestamp string to a local time string.
 * @param isoString - ISO timestamp (e.g., "2026-03-16T21:07:56.573Z") or
 *                    already-formatted time (e.g., "4:07 PM")
 * @returns e.g., "4:07 PM"
 */
export function formatTime(isoString: string): string {
  if (!isoString) return '';

  // If it doesn't look like an ISO timestamp, return as-is (already formatted)
  if (!isoString.includes('T')) return isoString;

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats a location string for display. If the string looks like raw
 * coordinates ("lat,lng"), formats it as abbreviated coordinates.
 * Otherwise returns it as-is (already a place name).
 * @param location - Location name or "lat,lng" coordinate string
 * @returns Human-readable location label
 */
export function formatLocation(location: string): string {
  if (!location) return 'Unknown';

  // Check if this looks like a "lat,lng" coordinate string
  const parts = location.split(',');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  return location;
}
