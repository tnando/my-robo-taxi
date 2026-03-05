import { notFound } from 'next/navigation';

import { SharedViewerScreen, getVehicles } from '@/features/vehicles';
import { MOCK_DRIVES } from '@/lib/mock-data';

interface SharedViewerPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Shared viewer page — authenticated live view for invited viewers.
 * No bottom nav, single vehicle with full bottom sheet experience.
 * TODO: Use token to resolve a specific shared vehicle via invite lookup.
 * For now, fetches the first vehicle for the authenticated user.
 */
export default async function SharedViewerPage({ params }: SharedViewerPageProps) {
  const { token: _token } = await params;
  const vehicles = await getVehicles();
  const vehicle = vehicles[0];

  if (!vehicle) {
    notFound();
  }

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
