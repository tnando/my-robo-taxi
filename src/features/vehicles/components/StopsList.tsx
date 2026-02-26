import type { TripStop } from '@/types/vehicle';

/** Props for the StopsList component. */
export interface StopsListProps {
  /** Intermediate stops on the trip. */
  stops: TripStop[];
}

/**
 * List of trip stops with type-appropriate icons.
 * Charging stops get a gold bolt icon, waypoints get a muted dot.
 */
export function StopsList({ stops }: StopsListProps) {
  if (stops.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-2">Stops</p>
      {stops.map((stop, i) => (
        <div key={i} className="flex items-start gap-2 mb-2">
          {stop.type === 'charging' ? (
            <svg className="w-4 h-4 text-gold mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.5 1L4 9h3.5v6L12 7H8.5V1z" />
            </svg>
          ) : (
            <div className="w-2 h-2 rounded-full bg-text-muted mt-1.5 ml-1 mr-1 shrink-0" />
          )}
          <div>
            <p className="text-text-primary text-sm">{stop.name}</p>
            <p className="text-text-muted text-xs font-light">{stop.address}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
