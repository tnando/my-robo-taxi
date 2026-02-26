import type { Vehicle } from '@/types/vehicle';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { getStatusMessage, getBatteryColor, getBatteryTextColor } from '@/lib/vehicle-helpers';

/** Props for the ParkedPeekContent component. */
export interface ParkedPeekContentProps {
  /** The parked/charging/offline vehicle. */
  vehicle: Vehicle;
}

/**
 * Bottom sheet peek content when vehicle is parked, charging, or offline.
 * Vehicle name, status badge, status message, location, battery bar.
 */
export function ParkedPeekContent({ vehicle }: ParkedPeekContentProps) {
  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{vehicle.name}</h2>
          <p className="text-text-secondary text-sm font-light mt-0.5">
            {getStatusMessage(vehicle)}
          </p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-text-secondary text-sm font-light">{vehicle.locationName}</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium tabular-nums ${getBatteryTextColor(vehicle.chargeLevel)}`}>
            {vehicle.chargeLevel}%
          </span>
          <div className="w-16 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${getBatteryColor(vehicle.chargeLevel)}`}
              style={{ width: `${vehicle.chargeLevel}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
