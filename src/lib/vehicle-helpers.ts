/**
 * Vehicle status utility functions.
 * Maps vehicle state to display strings and Tailwind color classes.
 */

import type { Vehicle, VehicleStatus, GearPosition, StatusConfigMap } from '@/types/vehicle';

/** Status configuration for UI rendering — maps status to color and label. */
export const STATUS_CONFIG: StatusConfigMap = {
  driving: { color: '#30D158', label: 'Driving', dotColor: 'bg-status-driving' },
  parked: { color: '#3B82F6', label: 'Parked', dotColor: 'bg-status-parked' },
  charging: { color: '#30D158', label: 'Charging', dotColor: 'bg-status-charging' },
  offline: { color: '#6B6B6B', label: 'Offline', dotColor: 'bg-status-offline' },
  in_service: { color: '#FF9F0A', label: 'In Service', dotColor: 'bg-status-in-service' },
};

/**
 * Returns a human-readable status message for a vehicle.
 * Includes gear position context when available.
 * @param vehicle - The vehicle to describe
 */
export function getStatusMessage(vehicle: Vehicle): string {
  switch (vehicle.status) {
    case 'driving': {
      const gear = vehicle.gearPosition;
      if (gear === 'R') {
        return `Reversing — ${vehicle.speed} mph at ${vehicle.locationName}`;
      }
      return `Driving — ${vehicle.speed} mph on ${vehicle.locationName}`;
    }
    case 'parked':
      return `Parked at ${vehicle.locationName}`;
    case 'charging':
      return `Charging at ${vehicle.locationName} — ${vehicle.chargeLevel}%`;
    case 'offline':
      return `Offline — Last seen at ${vehicle.locationName}`;
    case 'in_service':
      return `In Service at ${vehicle.locationName}`;
  }
}

/**
 * Returns the Tailwind background color class for a battery level.
 * Always green when charging. Otherwise: green > 50%, yellow 20-50%, red < 20%.
 */
export function getBatteryColor(level: number, status?: VehicleStatus): string {
  if (status === 'charging') return 'bg-battery-high';
  if (level > 50) return 'bg-battery-high';
  if (level > 20) return 'bg-battery-mid';
  return 'bg-battery-low';
}

/**
 * Returns the Tailwind text color class for a battery level.
 * Always green when charging. Otherwise: green > 50%, yellow 20-50%, red < 20%.
 */
export function getBatteryTextColor(level: number, status?: VehicleStatus): string {
  if (status === 'charging') return 'text-battery-high';
  if (level > 50) return 'text-battery-high';
  if (level > 20) return 'text-battery-mid';
  return 'text-battery-low';
}

/** Returns true when the vehicle is actively driving. */
export function isDriving(status: VehicleStatus): boolean {
  return status === 'driving';
}

/**
 * Safely extract routeCoordinates from WebSocket-merged vehicle state.
 * The telemetry server injects this field via vehicle_update but it's
 * not on the Vehicle type — check existence at runtime.
 */
export function getLiveRoute(vehicle: Vehicle): [number, number][] | undefined {
  if ('routeCoordinates' in vehicle) {
    const coords = (vehicle as unknown as { routeCoordinates: unknown }).routeCoordinates;
    if (Array.isArray(coords) && coords.length > 0) {
      return coords as [number, number][];
    }
  }
  return undefined;
}

/**
 * Resolves the displayed gear from the raw shift_state value.
 * Tesla returns null for shift_state when parked (engine off), so we
 * infer P from the vehicle status in that case.
 */
export function resolveGear(
  gearPosition: GearPosition | null,
  status: VehicleStatus,
): GearPosition {
  if (gearPosition !== null) return gearPosition;
  // Tesla returns null when the car is parked with the motor off
  if (status === 'driving') return 'D';
  return 'P';
}
