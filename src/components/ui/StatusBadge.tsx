'use client';

import { STATUS_CONFIG } from '@/lib/vehicle-helpers';
import type { VehicleStatus } from '@/types/vehicle';

/** Props for the StatusBadge component. */
export interface StatusBadgeProps {
  /** Vehicle status to display. */
  status: VehicleStatus;
}

/**
 * Minimal status indicator: a colored dot + status label text.
 * Color is determined by the vehicle status (driving, parked, charging, offline).
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <span style={{ color: config.color }}>{config.label}</span>
    </span>
  );
}
