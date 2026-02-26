import { SharedViewerScreen } from '@/features/vehicles';
import { MOCK_VEHICLES } from '@/lib/mock-data';

/**
 * Shared viewer page — anonymous live view for invited viewers.
 * No bottom nav, simplified bottom sheet.
 * Token param will be used to look up the shared vehicle in production.
 */
export default function SharedViewerPage() {
  // In production, token from params would resolve to a vehicle
  const vehicle = MOCK_VEHICLES[0];

  return (
    <SharedViewerScreen vehicle={vehicle} ownerName="Thomas" />
  );
}
