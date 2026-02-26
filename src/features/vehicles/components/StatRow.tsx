import { getBatteryTextColor } from '@/lib/vehicle-helpers';

/** Props for the StatRow component. */
export interface StatRowProps {
  /** ETA in minutes (shown for driving state). */
  etaMinutes?: number;
  /** Current speed in mph. */
  speed: number;
  /** Battery charge level (0-100). */
  chargeLevel: number;
}

/**
 * Key stats row with dividers — ETA / Speed / Battery.
 * ETA column only renders when etaMinutes is provided (driving state).
 */
export function StatRow({ etaMinutes, speed, chargeLevel }: StatRowProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      {etaMinutes != null && (
        <>
          <div className="text-center flex-1">
            <p className="text-xl font-semibold tabular-nums text-text-primary">{etaMinutes} min</p>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">ETA</p>
          </div>
          <div className="w-px h-8 bg-border-default" />
        </>
      )}

      <div className="text-center flex-1">
        <p className="text-xl font-semibold tabular-nums text-text-primary">{speed} mph</p>
        <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Speed</p>
      </div>

      <div className="w-px h-8 bg-border-default" />

      <div className="text-center flex-1">
        <p className={`text-xl font-semibold tabular-nums ${getBatteryTextColor(chargeLevel)}`}>
          {chargeLevel}%
        </p>
        <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Battery</p>
      </div>
    </div>
  );
}
