'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Vehicle, TripStop, VehicleStatus } from '@/types/vehicle';

/**
 * Format a DateTime as a relative time string (e.g., "3s ago", "5m ago", "2h ago").
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

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

/** Shape of a TripStop row from Prisma (excluding relation fields). */
interface PrismaTripStop {
  id: string;
  vehicleId: string;
  name: string;
  address: string;
  type: 'charging' | 'waypoint';
}

/** Shape of a Vehicle row from Prisma with included stops. */
interface PrismaVehicleWithStops {
  id: string;
  name: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  chargeLevel: number;
  estimatedRange: number;
  status: string;
  speed: number;
  heading: number;
  locationName: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  interiorTemp: number;
  exteriorTemp: number;
  odometerMiles: number;
  fsdMilesToday: number;
  destinationName: string | null;
  destinationAddress: string | null;
  etaMinutes: number | null;
  tripDistanceMiles: number | null;
  tripDistanceRemaining: number | null;
  lastUpdated: Date;
  stops: PrismaTripStop[];
}

/**
 * Map a Prisma vehicle row (with stops) to the Vehicle TypeScript interface.
 */
function mapPrismaVehicleToVehicle(prismaVehicle: PrismaVehicleWithStops): Vehicle {
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
    status: prismaVehicle.status as VehicleStatus,
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

/**
 * Fetch all vehicles for the currently authenticated user.
 * Returns an empty array if the user is not authenticated.
 */
export async function getVehicles(): Promise<Vehicle[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const prismaVehicles = await prisma.vehicle.findMany({
    where: { userId: session.user.id },
    include: { stops: true },
    orderBy: { createdAt: 'asc' },
  });

  return prismaVehicles.map(mapPrismaVehicleToVehicle);
}

/**
 * Fetch a single vehicle by ID, verifying it belongs to the current user.
 * Returns null if the vehicle is not found or does not belong to the user.
 */
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const prismaVehicle = await prisma.vehicle.findFirst({
    where: { id, userId: session.user.id },
    include: { stops: true },
  });

  if (!prismaVehicle) {
    return null;
  }

  return mapPrismaVehicleToVehicle(prismaVehicle);
}
