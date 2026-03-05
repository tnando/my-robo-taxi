import { DriveHistoryScreen, getDrives } from '@/features/drives';
import { MOCK_VEHICLES } from '@/lib/mock-data';

/**
 * Drive history page — list of completed drives.
 * Fetches drives via server action; vehicle data is still mock until
 * vehicle server actions are created.
 */
export default async function DrivesPage() {
  const vehicle = MOCK_VEHICLES[0];
  const drives = await getDrives();

  return <DriveHistoryScreen vehicle={vehicle} drives={drives} />;
}
