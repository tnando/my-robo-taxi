'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

import type { Vehicle } from '@/types/vehicle';
import type { Drive } from '@/types/drive';

import { BottomSheet, shouldShowHalfContent } from '@/components/layout/BottomSheet';

import { useBottomSheet } from '../hooks/use-bottom-sheet';
import { VehicleDotSelector } from './VehicleDotSelector';
import { DrivingPeekContent } from './DrivingPeekContent';
import { ParkedPeekContent } from './ParkedPeekContent';
import { DrivingHalfContent } from './DrivingHalfContent';
import { ParkedHalfContent } from './ParkedHalfContent';

// Dynamic import — Mapbox depends on window/document
const VehicleMap = dynamic(
  () => import('@/components/map/VehicleMap').then((m) => ({ default: m.VehicleMap })),
  { ssr: false },
);

/** Props for the HomeScreen component. */
export interface HomeScreenProps {
  /** All linked vehicles. */
  vehicles: Vehicle[];
  /** All drives (used to find the latest drive for the current vehicle). */
  drives: Drive[];
}

/**
 * Main home screen orchestrator — full-screen map with bottom sheet.
 * Coordinates VehicleMap, VehicleDotSelector, BottomSheet, and peek/half content.
 */
export function HomeScreen({ vehicles, drives }: HomeScreenProps) {
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
  const sheet = useBottomSheet('peek');

  const vehicle = vehicles[currentVehicleIndex];

  // Find the most recent drive for the current vehicle
  const currentDrive = useMemo(() => {
    const vehicleDrives = drives
      .filter((d) => d.vehicleId === vehicle.id)
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.startTime.localeCompare(a.startTime);
      });
    return vehicleDrives[0] as Drive | undefined;
  }, [vehicle.id, drives]);

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
        >
          {/* Compass labels */}
          <CompassLabels sheetHeight={sheet.currentHeight} />

          {/* Vehicle dot selector */}
          <VehicleDotSelector
            vehicles={vehicles}
            currentIndex={currentVehicleIndex}
            onSelect={setCurrentVehicleIndex}
          />
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
