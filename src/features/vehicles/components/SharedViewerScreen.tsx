'use client';

import dynamic from 'next/dynamic';

import type { Vehicle } from '@/types/vehicle';
import type { Drive } from '@/types/drive';

import { BottomSheet, shouldShowHalfContent } from '@/components/layout/BottomSheet';
import { SHARED_SHEET_PEEK_HEIGHT } from '@/lib/constants';

import { useBottomSheet } from '../hooks/use-bottom-sheet';
import { DrivingPeekContent } from './DrivingPeekContent';
import { ParkedPeekContent } from './ParkedPeekContent';
import { DrivingHalfContent } from './DrivingHalfContent';
import { ParkedHalfContent } from './ParkedHalfContent';

// Dynamic import — Mapbox depends on window/document
const VehicleMap = dynamic(
  () => import('@/components/map/VehicleMap').then((m) => ({ default: m.VehicleMap })),
  { ssr: false },
);

/** Props for the SharedViewerScreen component. */
export interface SharedViewerScreenProps {
  /** The shared vehicle to display. */
  vehicle: Vehicle;
  /** The owner name to show in the banner. */
  ownerName: string;
  /** Current drive for driving content (trip progress, destinations). */
  currentDrive?: Drive;
}

/**
 * Authenticated shared viewer screen — full-screen map with bottom sheet.
 * Reuses the same BottomSheet, drag/snap, and peek/half content as HomeScreen.
 * Scoped to a single vehicle with no vehicle switching or bottom nav.
 */
export function SharedViewerScreen({ vehicle, ownerName, currentDrive }: SharedViewerScreenProps) {
  const sheet = useBottomSheet('peek', { peekHeight: SHARED_SHEET_PEEK_HEIGHT });

  const isDriving = vehicle.status === 'driving';
  const routePoints = currentDrive?.routePoints;

  // Trip progress (0-1)
  const tripProgress =
    vehicle.tripDistanceMiles && vehicle.tripDistanceRemaining != null
      ? (vehicle.tripDistanceMiles - vehicle.tripDistanceRemaining) / vehicle.tripDistanceMiles
      : 0;

  const showHalf = shouldShowHalfContent(sheet.sheetState, sheet.isDragging, sheet.currentHeight);

  return (
    <div className="h-screen bg-bg-primary relative overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <VehicleMap
          showVehicleMarker
          showRoute={isDriving}
          routeCoordinates={routePoints}
          vehiclePosition={isDriving ? [vehicle.longitude, vehicle.latitude] : undefined}
          heading={vehicle.heading}
          center={[vehicle.longitude, vehicle.latitude]}
          zoom={12}
          fitButtonBottom={sheet.currentHeight + 16}
        >
          {/* Top banner */}
          <SharedViewerBanner ownerName={ownerName} vehicleName={vehicle.model} />

          {/* Compass labels */}
          <CompassLabels sheetHeight={sheet.currentHeight} />
        </VehicleMap>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        height={sheet.currentHeight}
        isDragging={sheet.isDragging}
        sheetState={sheet.sheetState}
        onTouchStart={sheet.onTouchStart}
        onTouchMove={sheet.onTouchMove}
        onTouchEnd={sheet.onTouchEnd}
        onToggle={sheet.toggle}
      >
        {/* Peek content */}
        {isDriving ? (
          <DrivingPeekContent
            vehicle={vehicle}
            currentDrive={currentDrive}
            tripProgress={tripProgress}
          />
        ) : (
          <ParkedPeekContent vehicle={vehicle} />
        )}

        {/* Half content */}
        {showHalf && (
          isDriving ? (
            <DrivingHalfContent vehicle={vehicle} currentDrive={currentDrive} />
          ) : (
            <ParkedHalfContent vehicle={vehicle} />
          )
        )}

      </BottomSheet>
    </div>
  );
}

/** Top banner for the shared viewer — "Watching owner's vehicle". */
function SharedViewerBanner({
  ownerName,
  vehicleName,
}: {
  ownerName: string;
  vehicleName: string;
}) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20">
      <div className="bg-bg-primary/60 backdrop-blur-md px-6 py-8">
        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
          <p className="text-text-secondary text-sm font-light">
            Watching <span className="text-gold font-medium">{ownerName}&apos;s {vehicleName}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Subtle compass direction labels overlaying the map. */
function CompassLabels({ sheetHeight }: { sheetHeight: number }) {
  return (
    <>
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 text-[10px] text-white/30 font-light select-none pointer-events-none">
        N
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 text-[10px] text-white/30 font-light select-none pointer-events-none"
        style={{ bottom: `${sheetHeight + 8}px` }}
      >
        S
      </div>
      <div className="absolute top-1/2 right-3 -translate-y-1/2 z-10 text-[10px] text-white/30 font-light select-none pointer-events-none">
        E
      </div>
      <div className="absolute top-1/2 left-3 -translate-y-1/2 z-10 text-[10px] text-white/30 font-light select-none pointer-events-none">
        W
      </div>
    </>
  );
}
