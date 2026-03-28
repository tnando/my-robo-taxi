'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

import type { Vehicle } from '@/types/vehicle';
import type { Drive } from '@/types/drive';
import { selectCurrentDrive } from '@/lib/drive-utils';

import { BottomSheet, shouldShowHalfContent } from '@/components/layout/BottomSheet';
import { CompassLabels } from '@/components/map/CompassLabels';

import { useBottomSheet } from '../hooks/use-bottom-sheet';
import { useBackgroundSync } from '../hooks/use-background-sync';
import { usePullToRefresh } from '../hooks/use-pull-to-refresh';
import { useVehicleStream } from '../hooks/use-vehicle-stream';
import { VehicleDotSelector } from './VehicleDotSelector';
import { DrivingPeekContent } from './DrivingPeekContent';
import { ParkedPeekContent } from './ParkedPeekContent';
import { DrivingHalfContent } from './DrivingHalfContent';
import { ParkedHalfContent } from './ParkedHalfContent';
import { VehicleSetupStepper } from './VehicleSetupStepper';

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
  /** Server action to trigger a background sync from Tesla. */
  onSync?: () => Promise<void>;
  /** Signed JWT for WebSocket authentication. */
  wsToken?: string;
  /** Authenticated user ID — passed to the setup stepper for server actions. */
  userId?: string;
}

/**
 * Main home screen orchestrator — full-screen map with bottom sheet.
 * Coordinates VehicleMap, VehicleDotSelector, BottomSheet, and peek/half content.
 */
export function HomeScreen({ vehicles, drives, onSync, wsToken, userId }: HomeScreenProps) {
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
  const sheet = useBottomSheet('peek');
  const syncAction = useMemo(() => onSync ?? (() => Promise.resolve()), [onSync]);
  const isAutoSyncing = useBackgroundSync(syncAction);
  const { pullDistance, isRefreshing } = usePullToRefresh(syncAction, sheet.sheetState);
  const isSyncing = isAutoSyncing || isRefreshing;

  // Real-time telemetry via WebSocket — merges live updates into vehicle state.
  // vehicles is a Record<string, Vehicle>; no Map allocation on each update.
  const { vehicles: liveVehicles } = useVehicleStream(vehicles, wsToken);

  // Use live vehicle data if available, fall back to server-rendered data.
  const allVehicles = useMemo(() => {
    if (Object.keys(liveVehicles).length === 0) return vehicles;
    return vehicles.map((v) => liveVehicles[v.id] ?? v);
  }, [vehicles, liveVehicles]);

  const vehicle = allVehicles[currentVehicleIndex];

  // Find the active drive for the current vehicle.
  // Prefers in-progress; falls back to most recent completed.
  const currentDrive = useMemo(
    () => selectCurrentDrive(drives, vehicle.id),
    [vehicle.id, drives],
  );

  const isDriving = vehicle.status === 'driving';

  // Prefer live route from WebSocket (decoded RouteLine from Tesla nav).
  // Fall back to stored route points from the database Drive record.
  const liveRoute = getLiveRoute(vehicle);
  const routePoints = (liveRoute && liveRoute.length >= 2) ? liveRoute : currentDrive?.routePoints;

  // Trip progress (0-1)
  const tripProgress =
    vehicle.tripDistanceMiles && vehicle.tripDistanceRemaining != null
      ? (vehicle.tripDistanceMiles - vehicle.tripDistanceRemaining) / vehicle.tripDistanceMiles
      : 0;

  const showHalf = shouldShowHalfContent(sheet.sheetState, sheet.isDragging, sheet.currentHeight);

  return (
    <div className="h-screen bg-bg-primary relative overflow-hidden">
      {/* Full-screen map — disable interaction during sheet drag */}
      <div className="absolute inset-0" style={{ pointerEvents: sheet.isDragging ? 'none' : 'auto' }}>
        <VehicleMap
          vehicle={{
            position: [vehicle.longitude, vehicle.latitude],
            heading: vehicle.heading,
            speed: vehicle.speed,
          }}
          route={{ show: isDriving, coordinates: routePoints }}
          center={[vehicle.longitude, vehicle.latitude]}
          zoom={12}
          fitButtonBottom={sheet.currentHeight + 20}
        >
          {/* Compass labels */}
          <CompassLabels sheetHeight={sheet.currentHeight} />

          {/* Vehicle dot selector */}
          <VehicleDotSelector
            vehicles={allVehicles}
            currentIndex={currentVehicleIndex}
            onSelect={setCurrentVehicleIndex}
          />
        </VehicleMap>
      </div>

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 transition-transform"
          style={{ top: Math.min(pullDistance - 30, 56) }}
        >
          <div className="w-8 h-8 rounded-full bg-bg-surface/80 backdrop-blur-sm border border-border-default flex items-center justify-center shadow-lg">
            <svg
              className="w-4 h-4 text-gold transition-transform"
              style={{ transform: `rotate(${pullDistance * 4}deg)`, opacity: Math.min(pullDistance / 80, 1) }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {/* Sync indicator */}
      {isSyncing && pullDistance === 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20" role="status">
          <div className="px-3 py-1 bg-bg-surface/80 backdrop-blur-sm rounded-full flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-xs text-text-secondary">Updating...</span>
          </div>
        </div>
      )}

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
        {/* Setup stepper — shown while vehicle is not yet fully connected */}
        {vehicle.setupStatus !== 'connected' && vehicle.vin && userId && (
          <div className="px-6 mb-4">
            <VehicleSetupStepper vehicle={vehicle} userId={userId} />
          </div>
        )}

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

        {/* Spacer for BottomNav overlap */}
        <div className="h-20" />
      </BottomSheet>
    </div>
  );
}

/**
 * Extract live route coordinates from WebSocket-merged vehicle state.
 * routeCoordinates is populated by the telemetry server from Tesla RouteLine
 * and is now a typed field on Vehicle.
 */
function getLiveRoute(vehicle: Vehicle): [number, number][] | undefined {
  if (vehicle.routeCoordinates && vehicle.routeCoordinates.length >= 2) {
    return vehicle.routeCoordinates;
  }
  return undefined;
}
