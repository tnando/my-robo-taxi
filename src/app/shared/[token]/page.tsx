import { SharedViewerScreen } from '@/features/vehicles';
import { MOCK_VEHICLES, MOCK_DRIVES } from '@/lib/mock-data';

/**
 * Shared viewer page — authenticated live view for invited viewers.
 * No bottom nav, single vehicle with full bottom sheet experience.
 * Token param will be used to look up the shared vehicle in production.
 */
export default function SharedViewerPage() {
  // In production, token from params would resolve to a vehicle
  const vehicle = MOCK_VEHICLES[0];

  // Find the active drive matching the vehicle's destination (when driving)
  const currentDrive = MOCK_DRIVES.find(
    (d) => d.vehicleId === vehicle.id && d.endLocation === vehicle.destinationName,
  );

  return (
    <SharedViewerScreen
      vehicle={vehicle}
      ownerName="Thomas"
      currentDrive={currentDrive}
    />
  );
}
