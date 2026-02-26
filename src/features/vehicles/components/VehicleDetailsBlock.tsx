import type { Vehicle } from '@/types/vehicle';

/** Props for the VehicleDetailsBlock component. */
export interface VehicleDetailsBlockProps {
  /** The vehicle to display details for. */
  vehicle: Vehicle;
}

/**
 * Vehicle information block — year, model, color, license plate.
 * Used in both driving and parked half states.
 */
export function VehicleDetailsBlock({ vehicle }: VehicleDetailsBlockProps) {
  return (
    <div className="mb-5">
      <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-2">Vehicle</p>
      <p className="text-text-primary font-medium">
        {vehicle.year} {vehicle.model}
      </p>
      <p className="text-text-secondary text-sm font-light mt-1">{vehicle.color}</p>
      <p className="text-text-muted text-xs mt-1">{vehicle.licensePlate}</p>
    </div>
  );
}
