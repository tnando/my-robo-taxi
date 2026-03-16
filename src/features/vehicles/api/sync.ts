import { detectAndRecordDrive } from '@/lib/drive-detection';
import { prisma } from '@/lib/prisma';
import { getTeslaAccessToken } from '@/lib/tesla';
import {
  listVehicles as teslaListVehicles,
  getVehicleData,
  getFleetStatus,
  wakeVehicle,
  TeslaApiError,
} from '@/lib/tesla-client';
import type { TeslaVehicleData } from '@/lib/tesla-client';
import { mapTeslaVehicleToUpsertData } from '@/lib/tesla-mapper';

export const STALENESS_THRESHOLD_MS = 30_000;
const WAKE_POLL_INTERVAL_MS = 3_000;
const WAKE_MAX_ATTEMPTS = 5; // 5 polls × 3s = 15s max wait

/** Poll for vehicle data after a wake command. Throws if vehicle never wakes. */
async function pollForVehicleData(
  accessToken: string,
  vehicleId: number,
): Promise<TeslaVehicleData> {
  for (let attempt = 0; attempt < WAKE_MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, WAKE_POLL_INTERVAL_MS));
    try {
      return await getVehicleData(accessToken, vehicleId);
    } catch (err) {
      if (err instanceof TeslaApiError && err.statusCode === 408) {
        continue; // Still asleep, try again
      }
      throw err;
    }
  }
  throw new TeslaApiError(
    `Vehicle did not wake after ${WAKE_MAX_ATTEMPTS} attempts`,
    408,
    false,
  );
}

/** Check whether Tesla response includes drive_state (virtual key paired). */
function hasFullData(vehicleData: TeslaVehicleData): boolean {
  return vehicleData.drive_state !== undefined;
}

/**
 * Sync vehicles from Tesla Fleet API into the database.
 * Internal function — called by getVehicles() and auth linkAccount event.
 */
export async function syncVehiclesFromTesla(userId: string): Promise<number> {
  const startTime = Date.now();

  // Verify user exists — a stale JWT may reference a deleted user.
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!userExists) return 0;

  const accessToken = await getTeslaAccessToken(userId);
  if (!accessToken) return 0;

  let teslaVehicles;
  try {
    teslaVehicles = await teslaListVehicles(accessToken);
  } catch (err) {
    console.error('[sync] Failed to list Tesla vehicles for user', userId, err);
    return 0;
  }
  let syncedCount = 0;
  let pairedCount = 0;
  let totalCount = 0;

  for (const listItem of teslaVehicles) {
    try {
      let vehicleData;
      try {
        vehicleData = await getVehicleData(accessToken, listItem.id);
      } catch (err) {
        if (err instanceof TeslaApiError && err.statusCode === 408) {
          // Vehicle is asleep — wake it and poll until it responds
          await wakeVehicle(accessToken, listItem.id);
          vehicleData = await pollForVehicleData(accessToken, listItem.id);
        } else {
          throw err;
        }
      }

      // Use fleet_status to determine virtual key pairing (more reliable
      // than checking if drive_state is present in the response).
      // Returns null on error — preserve existing DB value in that case.
      const keyPairedResult = await getFleetStatus(accessToken, listItem.vin);

      const fullData = hasFullData(vehicleData);
      totalCount++;

      const upsertData = mapTeslaVehicleToUpsertData(listItem, vehicleData);
      const teslaVehicleId = upsertData.teslaVehicleId;

      // When fleet_status fails (null), look up the existing DB value
      // so we don't flip a paired vehicle back to unpaired on a transient error.
      let keyPaired: boolean;
      if (keyPairedResult !== null) {
        keyPaired = keyPairedResult;
      } else {
        const existing = await prisma.vehicle.findUnique({
          where: { teslaVehicleId },
          select: { virtualKeyPaired: true },
        });
        keyPaired = existing?.virtualKeyPaired ?? false;
      }
      if (keyPaired) pairedCount++;

      // Skip lat/lng update when Tesla returns 0,0 (vehicle asleep/offline)
      // to preserve the last known position in the database.
      const hasValidCoords = upsertData.latitude !== 0 || upsertData.longitude !== 0;

      // When virtual key is not paired, only charge_state comes back.
      // Only update fields that have real data to avoid overwriting
      // previous values with mapper defaults.
      const updateData: Record<string, unknown> = {
        name: upsertData.name,
        status: upsertData.status,
        chargeLevel: upsertData.chargeLevel,
        estimatedRange: upsertData.estimatedRange,
        virtualKeyPaired: keyPaired,
        lastUpdated: new Date(),
      };

      if (fullData) {
        updateData.model = upsertData.model;
        updateData.year = upsertData.year;
        updateData.speed = upsertData.speed;
        updateData.heading = upsertData.heading;
        updateData.interiorTemp = upsertData.interiorTemp;
        updateData.exteriorTemp = upsertData.exteriorTemp;
        updateData.odometerMiles = upsertData.odometerMiles;
        // Navigation fields — set to null when no active route to clear stale data
        updateData.destinationName = upsertData.destinationName;
        updateData.etaMinutes = upsertData.etaMinutes;
        updateData.tripDistanceRemaining = upsertData.tripDistanceRemaining;
      }

      if (hasValidCoords) {
        updateData.latitude = upsertData.latitude;
        updateData.longitude = upsertData.longitude;
      }

      const vehicle = await prisma.vehicle.upsert({
        where: { teslaVehicleId },
        create: {
          ...upsertData,
          userId,
          color: '',
          licensePlate: '',
          virtualKeyPaired: keyPaired,
          lastUpdated: new Date(),
        },
        update: updateData,
      });

      // Detect drive state transitions (start/update/end drives).
      // Isolated in try/catch so drive detection errors don't block sync.
      if (fullData) {
        try {
          await detectAndRecordDrive({
            vehicleId: vehicle.id,
            status: upsertData.status,
            latitude: upsertData.latitude,
            longitude: upsertData.longitude,
            speed: upsertData.speed,
            chargeLevel: upsertData.chargeLevel,
            odometerMiles: upsertData.odometerMiles,
          });
        } catch (err) {
          console.error(
            `[sync] Drive detection failed for vehicle ${vehicle.id}:`,
            err,
          );
        }
      }

      syncedCount++;
    } catch (err) {
      console.error(`[sync] Failed to sync vehicle ${listItem.id} (step: fetch/upsert):`, err);
    }
  }

  // Update virtual key pairing status so the UI can show setup prompts.
  // Isolated from the vehicle sync so a settings error doesn't prevent
  // returning the successful vehicle sync count.
  if (teslaVehicles.length > 0) {
    const allPaired = pairedCount > 0 && pairedCount === totalCount;
    try {
      await prisma.settings.upsert({
        where: { userId },
        create: { userId, virtualKeyPaired: allPaired },
        update: { virtualKeyPaired: allPaired },
      });
    } catch (err) {
      console.error('[sync] Failed to update settings for user', userId, err);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[sync] Completed for user ${userId}: ${syncedCount}/${teslaVehicles.length} vehicles synced in ${durationMs}ms`,
  );

  return syncedCount;
}
