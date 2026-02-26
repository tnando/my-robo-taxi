import type { Vehicle } from '@/types/vehicle';

/** Props for the VehicleDotSelector component. */
export interface VehicleDotSelectorProps {
  /** All vehicles. */
  vehicles: Vehicle[];
  /** Index of the currently selected vehicle. */
  currentIndex: number;
  /** Callback when a vehicle dot is tapped. */
  onSelect: (index: number) => void;
}

/**
 * Dot indicators for switching between vehicles on the map.
 * Tap-only — NO swipe (conflicts with map panning).
 * Active dot is gold and wider, inactive dots are muted circles.
 */
export function VehicleDotSelector({ vehicles, currentIndex, onSelect }: VehicleDotSelectorProps) {
  if (vehicles.length <= 1) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex gap-2">
      {vehicles.map((v, idx) => (
        <button
          key={v.id}
          onClick={() => onSelect(idx)}
          className={`h-2 rounded-full transition-all duration-300 ${
            idx === currentIndex
              ? 'bg-gold w-6'
              : 'bg-text-muted/40 w-2'
          }`}
          aria-label={`Select ${v.name}`}
        />
      ))}
    </div>
  );
}
