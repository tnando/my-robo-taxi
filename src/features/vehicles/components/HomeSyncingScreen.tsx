'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { Vehicle } from '@/types/vehicle';

import { CarIcon } from './CarIcon';
import { useVehiclePolling } from '../hooks/use-vehicle-polling';

export interface HomeSyncingScreenProps {
  /** Server action that fetches cached vehicles from the database. */
  fetchVehicles: () => Promise<Vehicle[]>;
  /** Server action to link Tesla (shown if polling times out). */
  onLinkTesla: () => void;
}

/**
 * Syncing state shown after Tesla OAuth redirect when vehicles haven't
 * appeared in the database yet. Polls every 3 seconds for up to 15 seconds,
 * then falls back to a retry/link prompt.
 */
export function HomeSyncingScreen({ fetchVehicles, onLinkTesla }: HomeSyncingScreenProps) {
  const router = useRouter();
  const { vehicles, isPolling, timedOut } = useVehiclePolling(fetchVehicles, true);

  // When vehicles appear, refresh the page to render the full HomeScreen
  useEffect(() => {
    if (vehicles.length > 0) {
      router.refresh();
    }
  }, [vehicles, router]);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-primary to-bg-surface opacity-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gold/[0.03] blur-3xl" />

      <div className="relative z-10 text-center max-w-sm animate-fade-in">
        {/* Car icon */}
        <div className="mb-12">
          <CarIcon />
        </div>

        {isPolling ? (
          <>
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight mb-4">
              Syncing Your Vehicles
            </h1>
            <p className="text-text-secondary text-base font-light leading-relaxed mb-10">
              Connecting to Tesla and importing your vehicle data. This usually takes a few seconds.
            </p>

            {/* Animated sync indicator */}
            <div className="flex items-center justify-center gap-2" role="status">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </>
        ) : timedOut ? (
          <>
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight mb-4">
              Still Syncing
            </h1>
            <p className="text-text-secondary text-base font-light leading-relaxed mb-10">
              Your vehicle sync is taking longer than expected. Your car may be asleep or waking up. Try refreshing in a moment.
            </p>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => router.refresh()}
                className="w-full bg-gold text-bg-primary font-semibold py-4 px-6 rounded-xl hover:bg-gold-light transition-colors text-base"
              >
                Refresh
              </button>
              <form action={onLinkTesla}>
                <button
                  type="submit"
                  className="w-full border border-border-default text-text-primary font-medium py-4 px-6 rounded-xl hover:bg-bg-surface transition-colors text-base"
                >
                  Re-link Tesla
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
