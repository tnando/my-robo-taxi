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
 * Sync vehicles from Tesla Fleet API into the database.
 * Internal function — NOT a server action. Called by getVehicles() (which
 * validates the session) and by the auth linkAccount event.
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
          // Vehicle is asleep — wake it and poll until it responds
          await wakeVehicle(accessToken, listItem.id);
          vehicleData = await pollForVehicleData(accessToken, listItem.id);
        } else {
          throw err;
        }
      }

      const upsertData = mapTeslaVehicleToUpsertData(listItem, vehicleData);
      const teslaVehicleId = upsertData.teslaVehicleId;

      // Skip lat/lng update when Tesla returns 0,0 (vehicle asleep/offline)
      // to preserve the last known position in the database.
      const hasValidCoords = upsertData.latitude !== 0 || upsertData.longitude !== 0;

      const updateData: Record<string, unknown> = {
        name: upsertData.name,
        model: upsertData.model,
        year: upsertData.year,
        chargeLevel: upsertData.chargeLevel,
        estimatedRange: upsertData.estimatedRange,
        status: upsertData.status,
        speed: upsertData.speed,
        heading: upsertData.heading,
        interiorTemp: upsertData.interiorTemp,
        exteriorTemp: upsertData.exteriorTemp,
        odometerMiles: upsertData.odometerMiles,
        lastUpdated: new Date(),
      };

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
      console.warn(`Failed to sync Tesla vehicle ${listItem.id}:`, err);
    }
  }

  return syncedCount;
}
