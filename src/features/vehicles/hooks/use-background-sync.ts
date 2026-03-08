'use client';

import { useEffect, useTransition } from 'react';

/**
 * Triggers a background server action on mount and returns whether
 * the sync is still in progress. Uses `useTransition` so the sync
 * does not block the UI.
 */
export function useBackgroundSync(onSync: () => Promise<void>): boolean {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      await onSync();
    });
    // Only sync once on mount — onSync is a stable server action reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isPending;
}
