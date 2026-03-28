import { Prisma } from '@prisma/client';

import { VALID_GEARS } from '@/types/vehicle';
import type { Vehicle, TripStop, VehicleStatus, GearPosition, SetupStatus } from '@/types/vehicle';

export type PrismaVehicleWithStops = Prisma.VehicleGetPayload<{ include: { stops: true } }>;

/**
 * Format a DateTime as a relative time string (e.g., "3s ago", "5m ago", "2h ago").
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const VEHICLE_STATUS_MAP: Record<string, VehicleStatus> = {
  driving: 'driving',
  parked: 'parked',
  charging: 'charging',
  offline: 'offline',
  in_service: 'in_service',
};

const SETUP_STATUS_MAP: Record<string, SetupStatus> = {
  pending_pairing: 'pending_pairing',
  pairing_detected: 'pairing_detected',
  config_pushed: 'config_pushed',
  waiting_connection: 'waiting_connection',
  connected: 'connected',
};

function toSetupStatus(raw: string): SetupStatus {
  const status = SETUP_STATUS_MAP[raw];
  if (!status) return 'pending_pairing';
  return status;
}

function toGearPosition(raw: string | null): GearPosition | null {
  if (raw !== null && VALID_GEARS.has(raw)) return raw as GearPosition;
  return null;
}

function toVehicleStatus(prismaStatus: string): VehicleStatus {
  const status = VEHICLE_STATUS_MAP[prismaStatus];
  if (!status) {
    throw new Error(`Unknown vehicle status: ${prismaStatus}`);
  }
  return status;
}

/**
 * Map a Prisma vehicle row (with stops) to the Vehicle TypeScript interface.
 */
export function mapPrismaVehicleToVehicle(prismaVehicle: PrismaVehicleWithStops): Vehicle {
  const stops: TripStop[] = prismaVehicle.stops.map((stop) => ({
    name: stop.name,
    address: stop.address,
    type: stop.type,
  }));

  const vehicle: Vehicle = {
    id: prismaVehicle.id,
    vin: prismaVehicle.vin ?? undefined,
    name: prismaVehicle.name,
    model: prismaVehicle.model,
    year: prismaVehicle.year,
    color: prismaVehicle.color,
    licensePlate: prismaVehicle.licensePlate,
    chargeLevel: prismaVehicle.chargeLevel,
    estimatedRange: prismaVehicle.estimatedRange,
    status: toVehicleStatus(prismaVehicle.status),
    speed: prismaVehicle.speed,
    gearPosition: toGearPosition(prismaVehicle.gearPosition),
    heading: prismaVehicle.heading,
    locationName: prismaVehicle.locationName,
    locationAddress: prismaVehicle.locationAddress,
    latitude: prismaVehicle.latitude,
    longitude: prismaVehicle.longitude,
    interiorTemp: prismaVehicle.interiorTemp,
    exteriorTemp: prismaVehicle.exteriorTemp,
    lastUpdated: formatRelativeTime(prismaVehicle.lastUpdated),
    odometerMiles: prismaVehicle.odometerMiles,
    fsdMilesToday: prismaVehicle.fsdMilesToday,
    virtualKeyPaired: prismaVehicle.virtualKeyPaired,
    setupStatus: toSetupStatus(prismaVehicle.setupStatus),
  };

  // Only include optional trip fields when present
  if (prismaVehicle.destinationName) {
    vehicle.destinationName = prismaVehicle.destinationName;
  }
  if (prismaVehicle.destinationAddress) {
    vehicle.destinationAddress = prismaVehicle.destinationAddress;
  }
  if (prismaVehicle.destinationLatitude != null) {
    vehicle.destinationLatitude = prismaVehicle.destinationLatitude;
  }
  if (prismaVehicle.destinationLongitude != null) {
    vehicle.destinationLongitude = prismaVehicle.destinationLongitude;
  }
  if (prismaVehicle.originLatitude != null) {
    vehicle.originLatitude = prismaVehicle.originLatitude;
  }
  if (prismaVehicle.originLongitude != null) {
    vehicle.originLongitude = prismaVehicle.originLongitude;
  }
  if (prismaVehicle.etaMinutes != null) {
    vehicle.etaMinutes = prismaVehicle.etaMinutes;
  }
  if (prismaVehicle.tripDistanceMiles != null) {
    vehicle.tripDistanceMiles = prismaVehicle.tripDistanceMiles;
  }
  if (prismaVehicle.tripDistanceRemaining != null) {
    vehicle.tripDistanceRemaining = prismaVehicle.tripDistanceRemaining;
  }
  if (stops.length > 0) {
    vehicle.stops = stops;
  }

  return vehicle;
}
