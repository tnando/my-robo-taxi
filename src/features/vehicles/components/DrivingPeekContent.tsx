import type { Vehicle } from '@/types/vehicle';
import type { Drive } from '@/types/drive';

import { StatusBadge } from '@/components/ui/StatusBadge';

import { TripProgressBar } from './TripProgressBar';
import { StatRow } from './StatRow';

/** Props for the DrivingPeekContent component. */
export interface DrivingPeekContentProps {
  /** The driving vehicle. */
  vehicle: Vehicle;
  /** The current drive (for origin label). */
  currentDrive?: Drive;
  /** Trip completion fraction (0-1). */
  tripProgress: number;
}

/**
 * Bottom sheet peek content when vehicle is driving.
 * Vehicle name, status badge, destination, trip progress bar, stats row.
 */
export function DrivingPeekContent({
  vehicle,
  currentDrive,
  tripProgress,
}: DrivingPeekContentProps) {
  return (
    <div className="px-6">
      {/* Vehicle name + status badge + destination */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-text-primary">{vehicle.name}</h2>
        <StatusBadge status={vehicle.status} />
      </div>
      <p className="text-sm text-gold font-light mb-3">
        Heading to {vehicle.destinationName}
      </p>

      {/* Trip progress bar */}
      <TripProgressBar
        progress={tripProgress}
        stops={vehicle.stops ?? []}
        originLabel={currentDrive?.startLocation ?? 'Origin'}
        destinationLabel={vehicle.destinationName ?? 'Destination'}
      />

      {/* Key stats row */}
      <StatRow
        etaMinutes={vehicle.etaMinutes}
        speed={vehicle.speed}
        chargeLevel={vehicle.chargeLevel}
      />
    </div>
  );
}
