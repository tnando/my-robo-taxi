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
 * Prefers the Tesla-provided name; falls back to coordinates; omits entirely
 * when no data is available so the "Heading to" line is suppressed.
 */
function getDestinationLabel(vehicle: Vehicle): string {
  if (vehicle.destinationName) return vehicle.destinationName;
  if (vehicle.destinationLatitude != null && vehicle.destinationLongitude != null) {
    return `${vehicle.destinationLatitude.toFixed(4)}, ${vehicle.destinationLongitude.toFixed(4)}`;
  }
  return '';
}

/**
 * Derive a human-readable origin label. Prefers the drive record's address
 * (populated by backend geocoding); falls back to coordinates from telemetry.
 */
function getOriginLabel(vehicle: Vehicle, currentDrive?: Drive): string {
  if (currentDrive?.startAddress) return currentDrive.startAddress;
  if (currentDrive?.startLocation) return currentDrive.startLocation;
  if (vehicle.originLatitude != null && vehicle.originLongitude != null) {
    return `${vehicle.originLatitude.toFixed(4)}, ${vehicle.originLongitude.toFixed(4)}`;
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
        <StatusBadge status={vehicle.status} />
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
