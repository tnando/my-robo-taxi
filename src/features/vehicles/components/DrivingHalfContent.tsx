import type { Vehicle } from '@/types/vehicle';
import type { Drive } from '@/types/drive';

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
 * Extended bottom sheet content when vehicle is driving (half state).
 * Start/destination, stops, vehicle details, odometer, FSD, temps, timestamp.
 */
export function DrivingHalfContent({ vehicle, currentDrive }: DrivingHalfContentProps) {
  return (
    <div className="px-6 mt-6 pb-8 animate-fade-in">
      <div className="h-px bg-border-default mb-6" />

      {/* Start / Destination */}
      <div className="mb-5">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Start</p>
        <p className="text-text-primary text-sm font-light">
          {currentDrive?.startLocation ?? 'Unknown'} — {currentDrive?.startAddress ?? ''}
        </p>
      </div>

      <div className="mb-5">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Destination</p>
        <p className="text-text-primary text-sm font-light">
          {vehicle.destinationName} — {vehicle.destinationAddress}
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
          <p className="text-gold text-sm tabular-nums font-medium">{vehicle.fsdMilesToday} mi</p>
        </div>
      </div>

      {/* Temperature */}
      <div className="flex gap-10 mb-5">
        <div>
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Interior</p>
          <p className="text-text-primary text-sm tabular-nums">{vehicle.interiorTemp}&deg;F</p>
        </div>
        <div>
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Exterior</p>
          <p className="text-text-primary text-sm tabular-nums">{vehicle.exteriorTemp}&deg;F</p>
        </div>
      </div>

      <p className="text-text-muted text-xs">Updated {vehicle.lastUpdated}</p>
    </div>
  );
}
