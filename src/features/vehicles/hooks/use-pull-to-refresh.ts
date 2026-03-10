'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

/** Return type of the usePullToRefresh hook. */
export interface UsePullToRefreshReturn {
  /** How far the user has pulled (0 when idle). */
  pullDistance: number;
  /** Whether the refresh action is in flight. */
  isRefreshing: boolean;
}

/**
 * Detects a pull-down gesture in the top portion of the viewport
 * and triggers a server action when the threshold is exceeded.
 * Returns pull distance for visual feedback and refreshing state.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  isSheetDragging = false,
): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, startTransition] = useTransition();
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing || isSheetDragging) return;
    const y = e.touches[0].clientY;
    // Only activate in top 40% of viewport (map area, above bottom sheet)
    if (y < window.innerHeight * 0.4) {
      touchStartY.current = y;
      pulling.current = true;
    }
  }, [isRefreshing, isSheetDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || isRefreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 10) {
      const clamped = Math.min(delta, MAX_PULL);
      pullDistanceRef.current = clamped;
      setPullDistance(clamped);
    } else if (delta < -10) {
      // User swiped up — cancel pull
      pulling.current = false;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistanceRef.current >= PULL_THRESHOLD) {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      startTransition(async () => {
        await onRefresh();
      });
    } else {
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [onRefresh, startTransition]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
