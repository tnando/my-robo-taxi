'use server';

import { Prisma } from '@prisma/client';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTeslaAccessToken } from '@/lib/tesla';
import {
  listVehicles as teslaListVehicles,
  getVehicleData,
  wakeVehicle,
  TeslaApiError,
} from '@/lib/tesla-client';
import { mapTeslaVehicleToUpsertData } from '@/lib/tesla-mapper';
import type { Vehicle, TripStop, VehicleStatus } from '@/types/vehicle';

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

type PrismaVehicleWithStops = Prisma.VehicleGetPayload<{ include: { stops: true } }>;

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

const STALENESS_THRESHOLD_MS = 30_000;
const WAKE_WAIT_MS = 5_000;

/**
 * Sync vehicles from Tesla Fleet API into the database.
 * Returns the count of successfully synced vehicles.
 */
export async function syncVehiclesFromTesla(userId: string): Promise<number> {
  const accessToken = await getTeslaAccessToken(userId);
  if (!accessToken) return 0;

  let teslaVehicles;
  try {
    teslaVehicles = await teslaListVehicles(accessToken);
  } catch (err) {
    console.warn('Failed to list Tesla vehicles:', err);
    return 0;
  }
  let syncedCount = 0;

  for (const listItem of teslaVehicles) {
    try {
      let vehicleData;
      try {
        vehicleData = await getVehicleData(accessToken, listItem.id);
      } catch (err) {
        if (err instanceof TeslaApiError && err.statusCode === 408) {
          await wakeVehicle(accessToken, listItem.id);
          await new Promise((r) => setTimeout(r, WAKE_WAIT_MS));
          vehicleData = await getVehicleData(accessToken, listItem.id);
        } else {
          throw err;
        }
      }

      const upsertData = mapTeslaVehicleToUpsertData(listItem, vehicleData);
      const teslaVehicleId = upsertData.teslaVehicleId;

      await prisma.vehicle.upsert({
        where: { teslaVehicleId },
        create: {
          ...upsertData,
          userId,
          color: '',
          licensePlate: '',
          lastUpdated: new Date(),
        },
        update: {
          name: upsertData.name,
          model: upsertData.model,
          year: upsertData.year,
          chargeLevel: upsertData.chargeLevel,
          estimatedRange: upsertData.estimatedRange,
          status: upsertData.status,
          speed: upsertData.speed,
          heading: upsertData.heading,
          latitude: upsertData.latitude,
          longitude: upsertData.longitude,
          interiorTemp: upsertData.interiorTemp,
          exteriorTemp: upsertData.exteriorTemp,
          odometerMiles: upsertData.odometerMiles,
          lastUpdated: new Date(),
        },
      });
      syncedCount++;
    } catch (err) {
      console.warn(`Failed to sync Tesla vehicle ${listItem.id}:`, err);
    }
  }

  return syncedCount;
}

/**
 * Fetch all vehicles for the currently authenticated user.
 * Triggers a sync from Tesla if data is stale (>30s old).
 * Returns an empty array if the user is not authenticated.
 */
export async function getVehicles(): Promise<Vehicle[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  // Check staleness and sync if needed
  try {
    const latest = await prisma.vehicle.findFirst({
      where: { userId: session.user.id },
      orderBy: { lastUpdated: 'desc' },
      select: { lastUpdated: true },
    });

    const isStale =
      !latest || Date.now() - latest.lastUpdated.getTime() > STALENESS_THRESHOLD_MS;

    if (isStale) {
      await syncVehiclesFromTesla(session.user.id);
    }
  } catch {
    // Sync failure is expected with invalid/dev tokens — fall through to cached DB data
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
