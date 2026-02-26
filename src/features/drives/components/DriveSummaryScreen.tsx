'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

import type { Drive } from '@/types/drive';

import { StatItem } from './StatItem';
import { LocationTimeline } from './LocationTimeline';
import { SpeedSparkline } from './SpeedSparkline';
import { FSDSection } from './FSDSection';

// Dynamic import — Mapbox depends on window/document
const DriveRouteMap = dynamic(
  () => import('@/components/map/DriveRouteMap').then((m) => ({ default: m.DriveRouteMap })),
  { ssr: false },
);

/** Props for the DriveSummaryScreen component. */
export interface DriveSummaryScreenProps {
  drive: Drive;
}

/**
 * Detailed view of a single completed drive.
 * Hero map placeholder, location timeline, stats grid, speed sparkline, FSD section.
 */
export function DriveSummaryScreen({ drive }: DriveSummaryScreenProps) {
  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* Header */}
      <header className="px-6 pt-16 pb-6 flex items-center gap-4">
        <Link href="/drives" className="text-text-muted hover:text-text-secondary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-text-primary truncate">
            {drive.startLocation} to {drive.endLocation}
          </h1>
          <p className="text-text-muted text-xs font-light mt-0.5">
            {formatDate(drive.date)} — {drive.startTime}
          </p>
        </div>
      </header>

      {/* Hero route map */}
      <div className="mx-6 rounded-2xl overflow-hidden mb-8 h-48 bg-bg-surface">
        {drive.routePoints.length >= 2 ? (
          <DriveRouteMap routeCoordinates={drive.routePoints} className="h-48 rounded-2xl" />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-text-muted text-xs">No route data</p>
          </div>
        )}
      </div>

      {/* Location labels */}
      <div className="mx-6 mb-10">
        <LocationTimeline
          startLocation={drive.startLocation}
          startAddress={drive.startAddress}
          endLocation={drive.endLocation}
          endAddress={drive.endAddress}
        />
      </div>

      {/* Stats grid */}
      <div className="mx-6 mb-10">
        <div className="grid grid-cols-2 gap-6">
          <StatItem label="Distance" value={`${drive.distanceMiles} mi`} />
          <StatItem label="Duration" value={`${drive.durationMinutes} min`} />
          <StatItem label="FSD Miles" value={`${drive.fsdMiles} mi`} accent />
          <StatItem label="Battery" value={`${drive.startChargeLevel}% → ${drive.endChargeLevel}%`} />
          <StatItem label="Avg Speed" value={`${drive.avgSpeedMph} mph`} />
          <StatItem label="Max Speed" value={`${drive.maxSpeedMph} mph`} />
        </div>
      </div>

      {/* Speed sparkline */}
      <div className="mx-6 mb-10">
        <SpeedSparkline
          durationMinutes={drive.durationMinutes}
          avgSpeedMph={drive.avgSpeedMph}
          maxSpeedMph={drive.maxSpeedMph}
          startTime={drive.startTime}
          endTime={drive.endTime}
        />
      </div>

      {/* FSD Section */}
      {drive.fsdMiles > 0 && (
        <div className="mx-6 mb-10">
          <FSDSection
            fsdPercentage={drive.fsdPercentage}
            fsdMiles={drive.fsdMiles}
            interventions={drive.interventions}
          />
        </div>
      )}

      {/* Share button */}
      <div className="mx-6">
        <button className="w-full flex items-center justify-center gap-2 py-4 border border-gold/30 rounded-xl text-gold font-medium text-sm hover:bg-gold/5 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share Drive Summary
        </button>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
