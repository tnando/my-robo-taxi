'use client';

import { getBatteryColor, getBatteryTextColor } from '@/lib/vehicle-helpers';

/** Props for the BatteryBar component. */
export interface BatteryBarProps {
  /** Battery level percentage (0-100). */
  level: number;
  /** Whether to show the numeric percentage label. Defaults to true. */
  showLabel?: boolean;
}

/**
 * Thin horizontal progress bar showing charge level.
 * Color changes based on level: green > 50%, yellow 20-50%, red < 20%.
 * Optionally displays the numeric percentage alongside.
 */
export function BatteryBar({ level, showLabel = true }: BatteryBarProps) {
  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <span className={`tabular-nums text-sm font-medium ${getBatteryTextColor(level)}`}>
          {level}%
        </span>
      )}
      <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBatteryColor(level)}`}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}
