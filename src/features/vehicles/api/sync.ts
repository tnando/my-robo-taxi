import { prisma } from '@/lib/prisma';
import { getTeslaAccessToken } from '@/lib/tesla';
import {
  listVehicles as teslaListVehicles,
  getVehicleData,
  wakeVehicle,
  TeslaApiError,
} from '@/lib/tesla-client';
import type { TeslaVehicleData } from '@/lib/tesla-client';
import { mapTeslaVehicleToUpsertData } from '@/lib/tesla-mapper';

export const STALENESS_THRESHOLD_MS = 30_000;
const WAKE_POLL_INTERVAL_MS = 3_000;
const WAKE_MAX_ATTEMPTS = 5; // 5 polls × 3s = 15s max wait

/**
 * Poll for vehicle data after a wake command.
 * Retries up to WAKE_MAX_ATTEMPTS times with WAKE_POLL_INTERVAL_MS between each.
 * Throws if the vehicle never wakes.
 */
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

/**
 * Check whether the Tesla API response includes drive_state,
 * which indicates the virtual key is paired with the vehicle.
 */
function hasFullData(vehicleData: TeslaVehicleData): boolean {
  return vehicleData.drive_state !== undefined;
}

/**
 * Sync vehicles from Tesla Fleet API into the database.
 * Internal function — NOT a server action. Called by getVehicles() (which
 * validates the session) and by the auth linkAccount event.
 * Returns the count of successfully synced vehicles.
 */
export async function syncVehiclesFromTesla(userId: string): Promise<number> {
  const startTime = Date.now();
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
  let virtualKeyPaired = false;

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

      const fullData = hasFullData(vehicleData);
      if (fullData) virtualKeyPaired = true;

      const upsertData = mapTeslaVehicleToUpsertData(listItem, vehicleData);
      const teslaVehicleId = upsertData.teslaVehicleId;

      // Skip lat/lng update when Tesla returns 0,0 (vehicle asleep/offline)
      // to preserve the last known position in the database.
      const hasValidCoords = upsertData.latitude !== 0 || upsertData.longitude !== 0;

      // When virtual key is not paired, only charge_state comes back.
      // Only update fields that have real data to avoid overwriting
      // previous values with mapper defaults.
      const updateData: Record<string, unknown> = {
        name: upsertData.name,
        chargeLevel: upsertData.chargeLevel,
        estimatedRange: upsertData.estimatedRange,
        lastUpdated: new Date(),
      };

      if (fullData) {
        updateData.model = upsertData.model;
        updateData.year = upsertData.year;
        updateData.status = upsertData.status;
        updateData.speed = upsertData.speed;
        updateData.heading = upsertData.heading;
        updateData.interiorTemp = upsertData.interiorTemp;
        updateData.exteriorTemp = upsertData.exteriorTemp;
        updateData.odometerMiles = upsertData.odometerMiles;
      }

      if (hasValidCoords) {
        updateData.latitude = upsertData.latitude;
        updateData.longitude = upsertData.longitude;
      }

      await prisma.vehicle.upsert({
        where: { teslaVehicleId },
        create: {
          ...upsertData,
          userId,
          color: '',
          licensePlate: '',
          lastUpdated: new Date(),
        },
        update: updateData,
      });
      syncedCount++;
    } catch (err) {
      console.error(`[sync] Failed to sync vehicle ${listItem.id} (step: fetch/upsert):`, err);
    }
  }

  // Update virtual key pairing status so the UI can show setup prompts.
  // Isolated from the vehicle sync so a settings error doesn't prevent
  // returning the successful vehicle sync count.
  if (teslaVehicles.length > 0) {
    try {
      await prisma.settings.upsert({
        where: { userId },
        create: { userId, virtualKeyPaired },
        update: { virtualKeyPaired },
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
