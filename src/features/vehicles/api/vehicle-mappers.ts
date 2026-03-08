import { Prisma } from '@prisma/client';

import type { Vehicle, TripStop, VehicleStatus } from '@/types/vehicle';

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
};

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
    name: prismaVehicle.name,
    model: prismaVehicle.model,
    year: prismaVehicle.year,
    color: prismaVehicle.color,
    licensePlate: prismaVehicle.licensePlate,
    chargeLevel: prismaVehicle.chargeLevel,
    estimatedRange: prismaVehicle.estimatedRange,
    status: toVehicleStatus(prismaVehicle.status),
    speed: prismaVehicle.speed,
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
  };

  // Only include optional trip fields when present
  if (prismaVehicle.destinationName) {
    vehicle.destinationName = prismaVehicle.destinationName;
  }
  if (prismaVehicle.destinationAddress) {
    vehicle.destinationAddress = prismaVehicle.destinationAddress;
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
