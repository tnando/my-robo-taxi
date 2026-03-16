import type { VehicleStatus } from '@/types/vehicle';

/** Valid gear positions from Tesla drive_state.shift_state. */
export type GearPosition = 'P' | 'R' | 'N' | 'D';

const GEAR_LABELS: GearPosition[] = ['P', 'R', 'N', 'D'];

/** Color mapping for each gear position. */
const GEAR_COLORS: Record<GearPosition, string> = {
  P: '#3B82F6', // status-parked blue
  R: '#FF9F0A', // amber
  N: '#6B6B6B', // muted gray
  D: '#30D158', // status-driving green
};

/** Props for the GearIndicator component. */
export interface GearIndicatorProps {
  /** Current gear position from Tesla API (P/R/N/D or null). */
  gearPosition: string | null;
  /** Vehicle status — used to infer gear when shift_state is null. */
  status: VehicleStatus;
}

/**
 * Resolves the displayed gear from the raw shift_state value.
 * Tesla returns null for shift_state when parked (engine off), so we
 * infer P from the vehicle status in that case.
 */
export function resolveGear(
  gearPosition: string | null,
  status: VehicleStatus,
): GearPosition {
  if (gearPosition === 'D' || gearPosition === 'R' || gearPosition === 'N' || gearPosition === 'P') {
    return gearPosition;
  }
  // Tesla returns null when the car is parked with the motor off
  if (status === 'driving') return 'D';
  return 'P';
}

/**
 * Compact gear position indicator — shows P R N D in a horizontal row
 * with the active gear highlighted in its status color.
 */
export function GearIndicator({ gearPosition, status }: GearIndicatorProps) {
  const activeGear = resolveGear(gearPosition, status);

  return (
    <div className="inline-flex items-center gap-1.5" role="status" aria-label={`Gear: ${activeGear}`}>
      {GEAR_LABELS.map((gear) => {
        const isActive = gear === activeGear;
        return (
          <span
            key={gear}
            className={`text-xs font-semibold tabular-nums transition-colors ${
              isActive ? '' : 'text-text-muted/40'
            }`}
            style={isActive ? { color: GEAR_COLORS[gear] } : undefined}
            aria-current={isActive ? 'true' : undefined}
          >
            {gear}
          </span>
        );
      })}
    </div>
  );
}
