'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { formatDateLabel } from '@/lib/format';
import type { Drive, DriveSortBy } from '@/types/drive';
import type { Vehicle } from '@/types/vehicle';

import { useDriveSort } from '../hooks/use-drive-sort';
import { DriveListItem } from './DriveListItem';

/** Props for the DriveHistoryScreen component. */
export interface DriveHistoryScreenProps {
  vehicle: Vehicle | null;
  drives: Drive[];
}

const SORT_OPTIONS: DriveSortBy[] = ['date', 'distance', 'duration'];

/**
 * Drive history list screen with sort controls and date-grouped drives.
 * Shows an active drive banner when the vehicle is currently driving.
 */
export function DriveHistoryScreen({ vehicle, drives }: DriveHistoryScreenProps) {
  const { sortBy, setSortBy, sortedDrives } = useDriveSort(drives);

  const groupedDrives = useMemo(() => {
    const groups: Record<string, Drive[]> = {};
    for (const drive of sortedDrives) {
      const label = formatDateLabel(drive.date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(drive);
    }
    return groups;
  }, [sortedDrives]);

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* Header */}
      <header className="px-6 pt-16 pb-8">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Drives</h1>
        {vehicle && (
          <p className="text-text-muted text-sm font-light mt-1">{vehicle.name}</p>
        )}
      </header>

      {/* Active drive banner */}
      {vehicle?.status === 'driving' && (
        <Link
          href="/"
          className="mx-6 mb-6 flex items-center gap-3 p-4 rounded-xl border border-status-driving/20 bg-status-driving/[0.05]"
        >
          <div className="w-2 h-2 rounded-full bg-status-driving animate-pulse" />
          <span className="text-status-driving text-sm font-medium flex-1">Drive in progress</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}

      {/* Sort controls */}
      <div className="px-6 pb-6 flex gap-2" role="tablist">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option}
            role="tab"
            aria-selected={sortBy === option}
            onClick={() => setSortBy(option)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              sortBy === option
                ? 'bg-gold/10 text-gold'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      {/* Drive list grouped by date */}
      <div className="px-6 space-y-8">
        {drives.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted text-sm font-light">
              No drives recorded yet. Drives are detected automatically when your vehicle is in motion.
            </p>
          </div>
        ) : (
          Object.entries(groupedDrives).map(([dateLabel, dateDrives]) => (
            <div key={dateLabel}>
              <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-4">
                {dateLabel}
              </p>
              <div className="space-y-3">
                {dateDrives.map((drive) => (
                  <DriveListItem key={drive.id} drive={drive} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
