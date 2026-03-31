import type { Vehicle } from '@/types/vehicle';
import type { Drive } from '@/types/drive';

import { ClimateCard, climateCardPropsFromVehicle } from './ClimateCard';
import { VehicleDetailsBlock } from './VehicleDetailsBlock';
import { StopsList } from './StopsList';

/** Props for the DrivingHalfContent component. */
export interface DrivingHalfContentProps {
  /** The driving vehicle. */
  vehicle: Vehicle;
  /** The current drive (for start location). */
  currentDrive?: Drive;
}

/**
 * Derive a human-readable start label from the drive record.
 * Uses the drive's start address or location name — never falls back to
 * vehicle.originLatitude/originLongitude, which reflects Tesla's nav origin
 * (not necessarily where the drive actually started).
 */
function getStartLabel(_vehicle: Vehicle, currentDrive?: Drive): string {
  if (currentDrive?.startAddress) return currentDrive.startAddress;
  if (currentDrive?.startLocation && !currentDrive.startLocation.startsWith('0.0')) {
    return currentDrive.startLocation;
  }
  return 'Current location';
}

/**
 * Derive a human-readable destination label from available vehicle data.
 * Only uses Tesla's destination name — never raw coordinates.
 */
function getDestinationLabel(vehicle: Vehicle): string {
  if (vehicle.destinationName) return vehicle.destinationName;
  return '';
}

/**
 * Extended bottom sheet content when vehicle is driving (half state).
 * Start/destination, stops, vehicle details, odometer, FSD, temps, timestamp.
 */
export function DrivingHalfContent({ vehicle, currentDrive }: DrivingHalfContentProps) {
  const startLabel = getStartLabel(vehicle, currentDrive);
  const destinationLabel = getDestinationLabel(vehicle);

  return (
    <div className="px-6 mt-6 pb-8 animate-fade-in">
      <div className="h-px bg-border-default mb-6" />

      {/* Start / Destination */}
      <div className="mb-5">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Start</p>
        <p className="text-text-primary text-sm font-light">{startLabel}</p>
      </div>

      <div className="mb-5">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Destination</p>
        <p className="text-text-primary text-sm font-light">
          {vehicle.destinationAddress
            ? `${destinationLabel} — ${vehicle.destinationAddress}`
            : destinationLabel}
        </p>
      </div>

      {/* Stops */}
      <StopsList stops={vehicle.stops ?? []} />

      <div className="h-px bg-border-default mb-5" />

      {/* Vehicle details */}
      <VehicleDetailsBlock vehicle={vehicle} />

      {/* Odometer + FSD */}
      <div className="flex gap-10 mb-5">
        <div>
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Odometer</p>
          <p className="text-text-primary text-sm tabular-nums">
            {vehicle.odometerMiles.toLocaleString()} mi
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">FSD Today</p>
          <p className="text-gold text-sm tabular-nums font-medium">{vehicle.fsdMilesToday.toFixed(1)} mi</p>
        </div>
      </div>

      {/* Climate */}
      <ClimateCard climate={climateCardPropsFromVehicle(vehicle)} />

      <p className="text-text-muted text-xs">Updated {vehicle.lastUpdated}</p>
    </div>
  );
}
