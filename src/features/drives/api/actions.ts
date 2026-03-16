'use server';

import { Prisma } from '@prisma/client';
import type { Drive as PrismaDrive } from '@prisma/client';

import { auth } from '@/auth';
import { normalizeRoutePoints } from '@/features/drives/api/normalize-route-points';
import { formatLocation, formatTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import type { Drive, DriveSortBy } from '@/types/drive';

/**
 * Map a Prisma Drive record to the shared Drive interface.
 * Converts RoutePoint objects to LngLat tuples and formats time/location fields.
 */
function mapDrive({ createdAt, routePoints, ...rest }: PrismaDrive): Drive {
  return {
    ...rest,
    startTime: formatTime(rest.startTime),
    endTime: formatTime(rest.endTime),
    startLocation: formatLocation(rest.startLocation),
    endLocation: formatLocation(rest.endLocation),
    routePoints: normalizeRoutePoints(routePoints),
  };
}

/** Prisma orderBy clause for a given sort option. */
function buildOrderBy(sortBy: DriveSortBy) {
  switch (sortBy) {
    case 'distance':
      return { distanceMiles: 'desc' as const };
    case 'duration':
      return { durationMinutes: 'desc' as const };
    case 'date':
    default:
      return { date: 'desc' as const };
  }
}

/**
 * Fetch drives for the current user's vehicles.
 * Optionally filter by vehicleId and sort by date/distance/duration.
 */
export async function getDrives(
  vehicleId?: string,
  sortBy: DriveSortBy = 'date',
): Promise<Drive[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const where: Prisma.DriveWhereInput = {
    vehicle: { userId: session.user.id },
  };

  if (vehicleId) {
    where.vehicleId = vehicleId;
  }

  const records = await prisma.drive.findMany({
    where,
    orderBy: buildOrderBy(sortBy),
  });

  return records.map(mapDrive);
}

/**
 * Fetch a single drive by ID, verifying it belongs to the current user.
 * Returns null if not found or unauthorized.
 */
export async function getDriveById(driveId: string): Promise<Drive | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const record = await prisma.drive.findFirst({
    where: {
      id: driveId,
      vehicle: { userId: session.user.id },
    },
  });

  if (!record) return null;

  return mapDrive(record);
}
