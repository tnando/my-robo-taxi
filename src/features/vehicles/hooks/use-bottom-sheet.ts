'use client';

import { useState, useRef, useCallback, useMemo } from 'react';

import type { SheetState } from '../types';
import { SHEET_PEEK_HEIGHT, SHEET_HALF_FRACTION } from '@/lib/constants';

/** Return type of the useBottomSheet hook. */
export interface UseBottomSheetReturn {
  /** Current sheet state (peek or half). */
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
  /** Toggle between peek and half states (for click/keyboard). */
  toggle: () => void;
}

/** Options for the useBottomSheet hook. */
export interface UseBottomSheetOptions {
  /** Override the default peek height (defaults to SHEET_PEEK_HEIGHT). */
  peekHeight?: number;
}

/**
 * Hook for bottom sheet touch-drag with snap-to-nearest logic.
 * Two states: peek (260px default) and half (50vh). Snap to closest on release.
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

  const heights = useMemo<Record<SheetState, number>>(() => ({
    peek: peekHeight,
    half: halfHeight,
  }), [peekHeight, halfHeight]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = heights[sheetState];
    setIsDragging(true);
  }, [sheetState, heights]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - e.touches[0].clientY;
    setSheetOffset(deltaY);
  }, [isDragging]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const newHeight = dragStartHeight.current + sheetOffset;
    const midpoint = (heights.peek + heights.half) / 2;

    setSheetState(newHeight > midpoint ? 'half' : 'peek');
    setSheetOffset(0);
  }, [isDragging, sheetOffset, heights]);

  const toggle = useCallback(() => {
    setSheetState((prev) => (prev === 'peek' ? 'half' : 'peek'));
  }, []);

  const currentHeight = isDragging
    ? Math.max(120, Math.min(heights.half, dragStartHeight.current + sheetOffset))
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
