import type { Vehicle } from '@/types/vehicle';
import type { Drive } from '@/types/drive';

import { StatusBadge } from '@/components/ui/StatusBadge';

import { GearIndicator } from './GearIndicator';
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
 * Derive a human-readable destination label from available vehicle data.
 * Only uses Tesla's destination name — never raw coordinates.
 */
function getDestinationLabel(vehicle: Vehicle): string {
  if (vehicle.destinationName) return vehicle.destinationName;
  return '';
}

/** Check if a location string is effectively empty (zero coordinates). */
function isEmptyLocation(loc: string): boolean {
  return !loc || loc.startsWith('0.0') || loc === '';
}

/**
 * Derive a human-readable origin label from the drive record.
 * Filters out (0,0) coordinates which are protobuf defaults for "not set".
 */
function getOriginLabel(_vehicle: Vehicle, currentDrive?: Drive): string {
  if (currentDrive?.startAddress) return currentDrive.startAddress;
  if (currentDrive?.startLocation && !isEmptyLocation(currentDrive.startLocation)) {
    return currentDrive.startLocation;
  }
  return 'Origin';
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
  const destinationLabel = getDestinationLabel(vehicle);

  return (
    <div className="px-6">
      {/* Vehicle name + gear indicator + status badge */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold text-text-primary">{vehicle.name}</h2>
          <GearIndicator gearPosition={vehicle.gearPosition} status={vehicle.status} />
        </div>
        <StatusBadge status="driving" />
      </div>
      <p className="text-sm text-gold font-light mb-3">
        {destinationLabel ? `Heading to ${destinationLabel}` : 'Driving'}
      </p>

      {/* Trip progress bar */}
      <TripProgressBar
        progress={tripProgress}
        stops={vehicle.stops ?? []}
        originLabel={getOriginLabel(vehicle, currentDrive)}
        destinationLabel={destinationLabel || 'Destination'}
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
