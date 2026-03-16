'use client';

import Link from 'next/link';

import type { Drive } from '@/types/drive';

/** Props for the DriveListItem component. */
export interface DriveListItemProps {
  drive: Drive;
}

/**
 * A single drive card in the drive history list.
 * Shows route, time range, and stats (distance, duration, FSD, battery change).
 */
export function DriveListItem({ drive }: DriveListItemProps) {
  return (
    <Link
      href={`/drives/${drive.id}`}
      data-testid="drive-list-item"
      className="block bg-bg-surface rounded-2xl border border-border-default p-5 hover:bg-bg-surface-hover transition-colors"
    >
      {/* Route: Origin -> Destination */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-text-primary font-medium min-w-0">
          <span className="truncate">{drive.startLocation}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <span className="truncate">{drive.endLocation}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted shrink-0 ml-2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Time */}
      <p className="text-text-muted text-xs font-light mb-4">
        {drive.endTime ? `${drive.startTime} — ${drive.endTime}` : `${drive.startTime} — In progress`}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-5 text-xs">
        <span className="text-text-secondary tabular-nums">{drive.distanceMiles} mi</span>
        <span className="text-text-secondary tabular-nums">{drive.durationMinutes} min</span>
        {drive.fsdMiles > 0 && (
          <span className="text-gold tabular-nums font-medium">
            FSD {drive.fsdMiles} mi
          </span>
        )}
        <span className="text-text-muted tabular-nums ml-auto">
          {drive.startChargeLevel}% → {drive.endChargeLevel}%
        </span>
      </div>
    </Link>
  );
}
