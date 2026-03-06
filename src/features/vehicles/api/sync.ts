import { prisma } from '@/lib/prisma';
import { getTeslaAccessToken } from '@/lib/tesla';
import {
  listVehicles as teslaListVehicles,
  getVehicleData,
  wakeVehicle,
  TeslaApiError,
} from '@/lib/tesla-client';
import { mapTeslaVehicleToUpsertData } from '@/lib/tesla-mapper';

export const STALENESS_THRESHOLD_MS = 30_000;
const WAKE_WAIT_MS = 5_000;

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
