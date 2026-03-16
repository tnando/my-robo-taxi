import { DriveHistoryScreen, getDrives } from '@/features/drives';
import { getCachedVehicles } from '@/features/vehicles';

/**
 * Drive history page — list of completed drives.
 * Fetches real vehicle and drive data via server actions.
 */
export default async function DrivesPage() {
  const vehicles = await getCachedVehicles();
  const vehicle = vehicles[0] ?? null;
  const drives = await getDrives(vehicle?.id);

  return <DriveHistoryScreen vehicle={vehicle} drives={drives} />;
}
