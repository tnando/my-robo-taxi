'use client';

import { useState, useRef, useCallback, useMemo } from 'react';

import type { SheetState } from '../types';
import { SHEET_PEEK_HEIGHT, SHEET_HALF_FRACTION, SHEET_FULL_FRACTION } from '@/lib/constants';

/** Return type of the useBottomSheet hook. */
export interface UseBottomSheetReturn {
  /** Current sheet state (peek, half, or full). */
  sheetState: SheetState;
  /** Whether the user is currently dragging. */
  isDragging: boolean;
  /** Current computed sheet height in pixels. */
  currentHeight: number;
  /** Touch start handler for the sheet. */
  onTouchStart: (e: React.TouchEvent) => void;
  /** Touch move handler for the sheet. */
  onTouchMove: (e: React.TouchEvent) => void;
  /** Touch end handler for the sheet. */
  onTouchEnd: () => void;
  /** Cycle through sheet states (for click/keyboard). */
  toggle: () => void;
}

/** Options for the useBottomSheet hook. */
export interface UseBottomSheetOptions {
  /** Override the default peek height (defaults to SHEET_PEEK_HEIGHT). */
  peekHeight?: number;
}

/**
 * Find the nearest snap point to a given height.
 * Returns the SheetState whose height is closest to the target.
 */
function snapToNearest(target: number, heights: Record<SheetState, number>): SheetState {
  let closest: SheetState = 'peek';
  let minDist = Math.abs(target - heights.peek);

  const states: SheetState[] = ['half', 'full'];
  for (const state of states) {
    const dist = Math.abs(target - heights[state]);
    if (dist < minDist) {
      minDist = dist;
      closest = state;
    }
  }
  return closest;
}

/**
 * Hook for bottom sheet touch-drag with snap-to-nearest logic.
 * Three states: peek (260px), half (50vh), full (90vh).
 *
 * During drag, height tracks the finger exactly via a ref-based offset
 * to avoid per-pixel React state updates. Only `currentHeight` re-renders
 * via a single `sheetOffset` state that updates on each touchmove.
 */
export function useBottomSheet(
  initialState: SheetState = 'peek',
  options?: UseBottomSheetOptions,
): UseBottomSheetReturn {
  const peekHeight = options?.peekHeight ?? SHEET_PEEK_HEIGHT;

  const [sheetState, setSheetState] = useState<SheetState>(initialState);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const halfHeight = typeof window !== 'undefined'
    ? Math.round(window.innerHeight * SHEET_HALF_FRACTION)
    : 400;

  const fullHeight = typeof window !== 'undefined'
    ? Math.round(window.innerHeight * SHEET_FULL_FRACTION)
    : 720;

  const heights = useMemo<Record<SheetState, number>>(() => ({
    peek: peekHeight,
    half: halfHeight,
    full: fullHeight,
  }), [peekHeight, halfHeight, fullHeight]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = heights[sheetState];
    setIsDragging(true);
  }, [sheetState, heights]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const deltaY = dragStartY.current - e.touches[0].clientY;
    setSheetOffset(deltaY);
  }, [isDragging]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const newHeight = dragStartHeight.current + sheetOffset;
    setSheetState(snapToNearest(newHeight, heights));
    setSheetOffset(0);
  }, [isDragging, sheetOffset, heights]);

  const toggle = useCallback(() => {
    setSheetState((prev) => {
      if (prev === 'peek') return 'half';
      if (prev === 'half') return 'full';
      return 'peek';
    });
  }, []);

  // Clamp drag height between a min floor and full height
  const currentHeight = isDragging
    ? Math.max(120, Math.min(heights.full, dragStartHeight.current + sheetOffset))
    : heights[sheetState];

  return {
    sheetState,
    isDragging,
    currentHeight,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    toggle,
  };
}
