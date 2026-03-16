/**
 * Drive detection logic for Tesla vehicle sync.
 *
 * Tesla's REST API does NOT provide a "drive history" endpoint.
 * Instead, we detect drives by observing vehicle state transitions:
 * - Drive starts: shift_state -> "D"/"R" or speed > 0
 * - Drive ends: shift_state -> "P" or (speed = 0 and was driving)
 *
 * This module is called from sync.ts on every vehicle sync cycle (~30s).
 * Lives in lib/ (not features/drives/) to avoid cross-feature imports.
 */

import type { Prisma } from '@prisma/client';

import { totalDistanceFromRoutePoints } from '@/lib/geo';
import type { RoutePoint } from '@/lib/geo';
import { prisma } from '@/lib/prisma';
import type { VehicleStatus } from '@/types/vehicle';

// Re-export for consumers
export type { RoutePoint } from '@/lib/geo';

/** Data extracted from a Tesla sync for drive detection. */
export interface DriveDetectionInput {
  vehicleId: string;
  status: VehicleStatus;
  latitude: number;
  longitude: number;
  speed: number;
  chargeLevel: number;
  odometerMiles: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum drive duration (minutes) to persist. Filters out micro-drives. */
const MIN_DRIVE_DURATION_MINUTES = 2;

/** Minimum drive distance (miles) to persist. Filters out micro-drives. */
const MIN_DRIVE_DISTANCE_MILES = 0.1;

/**
 * Approximate kWh per percentage point for Tesla batteries (~75 kWh pack).
 * Real packs range 50-100 kWh across models; this is a rough average.
 * TODO: Look up actual pack size from vehicle model for more accurate estimates.
 */
const KWH_PER_PERCENT = 0.75;

// ─── Drive detection ──────────────────────────────────────────────────────────

/**
 * Detect drive state transitions and create/update/complete Drive records.
 * Called once per vehicle during each sync cycle.
 *
 * State machine:
 * 1. No active drive + vehicle driving -> START new drive
 * 2. Active drive + vehicle driving -> UPDATE route points & max speed
 * 3. Active drive + vehicle NOT driving -> END drive (with min filter)
 */
export async function detectAndRecordDrive(
  input: DriveDetectionInput,
): Promise<void> {
  const isDriving = input.status === 'driving';
  const hasValidCoords = input.latitude !== 0 || input.longitude !== 0;

  // Find active drive (no endTime) for this vehicle.
  // We use endTime: '' (empty string) as the "in progress" sentinel because
  // the Prisma schema defines endTime as a required String (not nullable).
  // If the schema ever changes to allow null, update this query accordingly.
  const activeDrive = await prisma.drive.findFirst({
    where: { vehicleId: input.vehicleId, endTime: '' },
  });

  if (!activeDrive && isDriving && hasValidCoords) {
    await startDrive(input);
  } else if (activeDrive && isDriving && hasValidCoords) {
    await updateActiveDrive(activeDrive.id, input);
  } else if (activeDrive && !isDriving) {
    await endDrive(activeDrive.id, input);
  }
}

// ─── Drive lifecycle ──────────────────────────────────────────────────────────

async function startDrive(input: DriveDetectionInput): Promise<void> {
  const now = new Date();
  const point: RoutePoint = {
    lat: input.latitude, lng: input.longitude,
    timestamp: now.toISOString(), speed: input.speed,
  };

  await prisma.drive.create({
    data: {
      vehicleId: input.vehicleId,
      date: now.toISOString().split('T')[0],
      startTime: now.toISOString(),
      endTime: '', // Empty string signals "in progress"
      startLocation: `${input.latitude},${input.longitude}`,
      startAddress: '', // Can be reverse geocoded later
      endLocation: '',
      endAddress: '',
      distanceMiles: 0,
      durationMinutes: 0,
      avgSpeedMph: 0,
      maxSpeedMph: input.speed,
      energyUsedKwh: 0,
      startChargeLevel: input.chargeLevel,
      endChargeLevel: input.chargeLevel,
      // FSD fields: Tesla API doesn't provide this data
      fsdMiles: 0,
      fsdPercentage: 0,
      interventions: 0,
      routePoints: [point] as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(`[drive-detection] Started drive for vehicle ${input.vehicleId}`);
}

async function updateActiveDrive(
  driveId: string,
  input: DriveDetectionInput,
): Promise<void> {
  const drive = await prisma.drive.findUnique({
    where: { id: driveId },
    select: { routePoints: true, maxSpeedMph: true },
  });
  if (!drive) return;

  const routePoints = (drive.routePoints as unknown as RoutePoint[]) ?? [];
  routePoints.push({
    lat: input.latitude, lng: input.longitude,
    timestamp: new Date().toISOString(), speed: input.speed,
  });

  await prisma.drive.update({
    where: { id: driveId },
    data: {
      routePoints: routePoints as unknown as Prisma.InputJsonValue,
      maxSpeedMph: Math.max(drive.maxSpeedMph, input.speed),
    },
  });
}

async function endDrive(
  driveId: string,
  input: DriveDetectionInput,
): Promise<void> {
  const drive = await prisma.drive.findUnique({ where: { id: driveId } });
  if (!drive) return;

  const now = new Date();
  const startTime = new Date(drive.startTime);
  const durationMinutes = Math.round(
    (now.getTime() - startTime.getTime()) / 60_000,
  );

  const routePoints = (drive.routePoints as unknown as RoutePoint[]) ?? [];

  // Add final point if we have valid coordinates
  if (input.latitude !== 0 || input.longitude !== 0) {
    routePoints.push({
      lat: input.latitude, lng: input.longitude,
      timestamp: now.toISOString(), speed: 0,
    });
  }

  const distanceMiles = totalDistanceFromRoutePoints(routePoints);

  // Filter out micro-drives (too short in time or distance)
  if (
    durationMinutes < MIN_DRIVE_DURATION_MINUTES &&
    distanceMiles < MIN_DRIVE_DISTANCE_MILES
  ) {
    await prisma.drive.delete({ where: { id: driveId } });
    console.log(
      `[drive-detection] Discarded micro-drive ${driveId} ` +
        `(${durationMinutes}min, ${distanceMiles.toFixed(2)}mi)`,
    );
    return;
  }

  const avgSpeedMph = durationMinutes > 0
    ? Math.round((distanceMiles / (durationMinutes / 60)) * 10) / 10
    : 0;

  // Estimate energy used from battery level difference
  const chargeUsed = Math.max(0, drive.startChargeLevel - input.chargeLevel);
  const energyUsedKwh = Math.round(chargeUsed * KWH_PER_PERCENT * 10) / 10;

  const endLocation = (input.latitude !== 0 || input.longitude !== 0)
    ? `${input.latitude},${input.longitude}`
    : drive.startLocation;

  await prisma.drive.update({
    where: { id: driveId },
    data: {
      endTime: now.toISOString(),
      endLocation,
      endAddress: '', // Can be reverse geocoded later
      distanceMiles: Math.round(distanceMiles * 100) / 100,
      durationMinutes,
      avgSpeedMph,
      maxSpeedMph: Math.max(drive.maxSpeedMph, input.speed),
      energyUsedKwh,
      endChargeLevel: input.chargeLevel,
      routePoints: routePoints as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `[drive-detection] Completed drive ${driveId}: ` +
      `${distanceMiles.toFixed(1)}mi, ${durationMinutes}min`,
  );
}
