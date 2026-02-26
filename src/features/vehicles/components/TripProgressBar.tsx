import type { TripStop } from '@/types/vehicle';

/** Props for the TripProgressBar component. */
export interface TripProgressBarProps {
  /** Trip completion fraction (0-1). */
  progress: number;
  /** Intermediate stops along the route. */
  stops: TripStop[];
  /** Origin location label. */
  originLabel: string;
  /** Destination location label. */
  destinationLabel: string;
}

/**
 * Glowing gold progress bar with diamond stop markers and origin/destination labels.
 * Leading edge has a pulsing dot. Stops are positioned proportionally along the track.
 */
export function TripProgressBar({
  progress,
  stops,
  originLabel,
  destinationLabel,
}: TripProgressBarProps) {
  return (
    <div className="mb-3">
      {/* Glowing progress bar */}
      <div className="relative h-1.5 bg-bg-elevated rounded-full">
        {/* Filled portion with glow */}
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: '#C9A84C',
            boxShadow: '0 0 8px rgba(201, 168, 76, 0.6), 0 0 20px rgba(201, 168, 76, 0.3)',
          }}
        >
          {/* Pulsing leading-edge dot */}
          <div
            className="absolute top-1/2 right-0 animate-gold-glow"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#C9A84C',
              boxShadow: '0 0 6px rgba(201, 168, 76, 0.8), 0 0 12px rgba(201, 168, 76, 0.4)',
            }}
          />
        </div>

        {/* Stop markers on the bar track */}
        {stops.map((stop, i) => {
          const stopPosition = (i + 1) / (stops.length + 1);
          return (
            <div
              key={i}
              className="absolute top-1/2 text-text-muted text-[8px] leading-none select-none pointer-events-none"
              style={{ left: `${stopPosition * 100}%`, transform: 'translate(-50%, -50%)' }}
              title={stop.name}
            >
              &#9670;
            </div>
          );
        })}
      </div>

      {/* Labels below the bar */}
      <div className="relative mt-1.5">
        <div className="flex justify-between">
          <span className="text-[10px] text-text-muted font-light">{originLabel}</span>
          <span className="text-[10px] text-text-muted font-light">{destinationLabel}</span>
        </div>
        {/* Stop labels positioned below their markers */}
        {stops.map((stop, i) => {
          const stopPosition = (i + 1) / (stops.length + 1);
          return (
            <span
              key={i}
              className="absolute text-[10px] text-text-muted font-light"
              style={{ left: `${stopPosition * 100}%`, transform: 'translateX(-50%)', top: 0 }}
            >
              {stop.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
