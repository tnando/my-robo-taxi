import type { Vehicle } from '@/types/vehicle';

import { getBatteryColor, getBatteryTextColor, STATUS_CONFIG } from '@/lib/vehicle-helpers';

import { VehicleDetailsBlock } from './VehicleDetailsBlock';

/** Props for the ParkedHalfContent component. */
export interface ParkedHalfContentProps {
  /** The parked/charging/offline vehicle. */
  vehicle: Vehicle;
}

/**
 * Extended bottom sheet content for parked/charging/offline (half state).
 * Location, odometer, FSD, heading, vehicle details, range, battery, temps, timestamp.
 */
export function ParkedHalfContent({ vehicle }: ParkedHalfContentProps) {
  const config = STATUS_CONFIG[vehicle.status];

  return (
    <div className="px-6 mt-6 pb-8 animate-fade-in">
      <div className="h-px bg-border-default mb-6" />

      {/* Location */}
      <div className="mb-5">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Location</p>
        <p className="text-text-primary text-sm font-light">{vehicle.locationAddress}</p>
      </div>

      {/* Odometer + FSD + Heading */}
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
        <div>
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Heading</p>
          <p className="text-text-secondary text-sm tabular-nums">{vehicle.heading}&deg;</p>
        </div>
      </div>

      <div className="h-px bg-border-default mb-5" />

      {/* Vehicle details */}
      <VehicleDetailsBlock vehicle={vehicle} />

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

      {/* Estimated Range */}
      <div className="mb-5">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Estimated Range</p>
        <p className="text-text-primary text-sm tabular-nums">{vehicle.estimatedRange} miles</p>
      </div>

      {/* Battery */}
      <div className="mb-5">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-2">Battery</p>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-medium tabular-nums ${getBatteryTextColor(vehicle.chargeLevel, vehicle.status)}`}>
            {vehicle.chargeLevel}%
          </span>
          <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${getBatteryColor(vehicle.chargeLevel, vehicle.status)}`}
              style={{ width: `${vehicle.chargeLevel}%`, backgroundColor: config.color }}
            />
          </div>
        </div>
      </div>

      <p className="text-text-muted text-xs">Updated {vehicle.lastUpdated}</p>
    </div>
  );
}
