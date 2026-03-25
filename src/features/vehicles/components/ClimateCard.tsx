import type { Vehicle, HvacPower, DefrostMode, ClimateKeeperMode } from '@/types/vehicle';

/** Props for the ClimateCard component. */
export interface ClimateCardProps {
  /** Interior temperature in °F. */
  interiorTemp: number;
  /** Exterior temperature in °F. */
  exteriorTemp: number;
  /** Whether the HVAC system is actively running. */
  isClimateOn?: boolean;
  /** Raw HVAC power state from Tesla telemetry. */
  hvacPower?: HvacPower;
  /** Fan speed 0–10. */
  fanSpeed?: number;
  /** Driver set-point temperature in °F. */
  driverTempSetting?: number;
  /** Passenger set-point temperature in °F. */
  passengerTempSetting?: number;
  /** Defrost mode. */
  defrostMode?: DefrostMode;
  /** Driver seat heater level 0–3. */
  seatHeaterLeft?: number;
  /** Passenger seat heater level 0–3. */
  seatHeaterRight?: number;
  /** Climate keeper mode. */
  climateKeeperMode?: ClimateKeeperMode;
}

/** Builds ClimateCardProps from a Vehicle, forwarding all climate fields. */
export function climateCardPropsFromVehicle(v: Vehicle): ClimateCardProps {
  return {
    interiorTemp: v.interiorTemp,
    exteriorTemp: v.exteriorTemp,
    isClimateOn: v.isClimateOn,
    hvacPower: v.hvacPower,
    fanSpeed: v.fanSpeed,
    driverTempSetting: v.driverTempSetting,
    passengerTempSetting: v.passengerTempSetting,
    defrostMode: v.defrostMode,
    seatHeaterLeft: v.seatHeaterLeft,
    seatHeaterRight: v.seatHeaterRight,
    climateKeeperMode: v.climateKeeperMode,
  };
}

/** Returns a human-readable label for the climate keeper mode. */
function keeperModeLabel(mode: ClimateKeeperMode | undefined): string | null {
  if (!mode || mode === 'off') return null;
  const labels: Record<Exclude<ClimateKeeperMode, 'off'>, string> = {
    keepOn: 'Keep On',
    dogMode: 'Dog Mode',
    campMode: 'Camp Mode',
  };
  return labels[mode as Exclude<ClimateKeeperMode, 'off'>];
}

/** Renders the fan speed progress bar (0–10 scale). */
function ClimateFanBar({ speed }: { speed: number }) {
  const pct = Math.min(100, Math.max(0, (speed / 10) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gold transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-text-secondary text-xs tabular-nums w-8 text-right">
        {speed}/10
      </span>
    </div>
  );
}

/** Renders seat heater level dots (0 = off, 1–3 = active segments). */
function SeatHeaterDots({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map((seg) => (
        <span
          key={seg}
          className={`inline-block w-1.5 h-1.5 rounded-full ${seg <= level ? 'bg-gold' : 'bg-bg-elevated'}`}
        />
      ))}
    </span>
  );
}

/**
 * ClimateCard — compact climate status card for the vehicle details sheet.
 *
 * Collapsed state (climate off): shows interior/exterior temps only.
 * Expanded state (climate on): shows fan speed, temp set-points, seat
 * heaters, defrost, and keeper mode.
 */
export function ClimateCard(props: ClimateCardProps) {
  const {
    interiorTemp,
    exteriorTemp,
    isClimateOn = false,
    fanSpeed = 0,
    driverTempSetting,
    passengerTempSetting,
    defrostMode,
    seatHeaterLeft = 0,
    seatHeaterRight = 0,
    climateKeeperMode,
  } = props;

  const modeLabel = keeperModeLabel(climateKeeperMode);

  return (
    <div className="bg-bg-surface border border-border-default rounded-xl p-4 mb-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Climate</p>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isClimateOn
              ? 'bg-gold/15 text-gold'
              : 'bg-bg-elevated text-text-muted'
          }`}
        >
          {isClimateOn ? 'On' : 'Off'}
        </span>
      </div>

      {/* Temps — always visible */}
      <div className="flex gap-8 mb-3">
        <div>
          <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-0.5">Interior</p>
          <p className="text-text-primary text-sm tabular-nums">{interiorTemp}&deg;F</p>
        </div>
        <div>
          <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-0.5">Exterior</p>
          <p className="text-text-primary text-sm tabular-nums">{exteriorTemp}&deg;F</p>
        </div>
      </div>

      {/* Expanded state — shown when climate is on */}
      {isClimateOn && (
        <div className="space-y-3 border-t border-border-subtle pt-3 animate-fade-in">
          {/* Set-point temps */}
          {(driverTempSetting != null || passengerTempSetting != null) && (
            <div className="flex gap-8">
              {driverTempSetting != null && (
                <div>
                  <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-0.5">Driver Set</p>
                  <p className="text-text-secondary text-sm tabular-nums">{driverTempSetting}&deg;F</p>
                </div>
              )}
              {passengerTempSetting != null && (
                <div>
                  <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-0.5">Passenger Set</p>
                  <p className="text-text-secondary text-sm tabular-nums">{passengerTempSetting}&deg;F</p>
                </div>
              )}
            </div>
          )}

          {/* Fan speed */}
          <div>
            <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-1.5">Fan Speed</p>
            <ClimateFanBar speed={fanSpeed} />
          </div>

          {/* Seat heaters */}
          <div className="flex gap-8">
            <div>
              <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-1">Driver Seat</p>
              <div className="flex items-center gap-1.5">
                <SeatHeaterDots level={seatHeaterLeft} />
                <span className="text-text-secondary text-xs tabular-nums">
                  {seatHeaterLeft > 0 ? `${seatHeaterLeft}/3` : 'Off'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-1">Pass. Seat</p>
              <div className="flex items-center gap-1.5">
                <SeatHeaterDots level={seatHeaterRight} />
                <span className="text-text-secondary text-xs tabular-nums">
                  {seatHeaterRight > 0 ? `${seatHeaterRight}/3` : 'Off'}
                </span>
              </div>
            </div>
          </div>

          {/* Defrost + Keeper mode */}
          <div className="flex gap-8">
            {defrostMode != null && (
              <div>
                <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-0.5">Defrost</p>
                <p className="text-text-secondary text-xs capitalize">{defrostMode}</p>
              </div>
            )}
            {modeLabel && (
              <div>
                <p className="text-text-muted text-[10px] font-medium uppercase tracking-wider mb-0.5">Mode</p>
                <p className="text-gold text-xs font-medium">{modeLabel}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
