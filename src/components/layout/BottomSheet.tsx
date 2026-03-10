'use client';

import type { SheetState } from '@/features/vehicles';
import { SHEET_PEEK_HEIGHT } from '@/lib/constants';

/** Props for the BottomSheet component. */
export interface BottomSheetProps {
  /** Current sheet height in pixels. */
  height: number;
  /** Whether the sheet is being dragged. */
  isDragging: boolean;
  /** Current sheet state for content decisions. */
  sheetState: SheetState;
  /** Touch start handler. */
  onTouchStart: (e: React.TouchEvent) => void;
  /** Touch move handler. */
  onTouchMove: (e: React.TouchEvent) => void;
  /** Touch end handler. */
  onTouchEnd: () => void;
  /** Click handler to toggle sheet state (desktop/trackpad). */
  onToggle: () => void;
  /** Sheet content. */
  children: React.ReactNode;
}

/**
 * Generic bottom sheet shell with rounded top corners, backdrop blur, and drag handle.
 * Height is controlled externally by the useBottomSheet hook.
 */
export function BottomSheet({
  height,
  isDragging,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onToggle,
  children,
}: BottomSheetProps) {
  return (
    <div
      role="region"
      aria-label="Vehicle details"
      className="absolute bottom-0 left-0 right-0 z-40 bg-bg-secondary/95 backdrop-blur-2xl rounded-t-[24px] border-t border-border-default"
      style={{
        height,
        transition: isDragging ? 'none' : 'height 0.3s ease-out',
      }}
    >
      {/* Drag handle — touch to drag, click to toggle on desktop */}
      <button
        type="button"
        onClick={onToggle}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex justify-center w-full pt-3 pb-2 cursor-pointer shrink-0 touch-none select-none"
        role="separator"
        aria-label="Toggle vehicle details"
      >
        <div className="w-9 h-1 rounded-full bg-bg-elevated" />
      </button>

      {/* Scrollable content area */}
      <div className="overflow-y-auto overscroll-contain" style={{ height: 'calc(100% - 28px)' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Returns true when the half-state content should be visible.
 * True during half/full state OR when dragging past peek + 30px threshold.
 */
export function shouldShowHalfContent(
  sheetState: SheetState,
  isDragging: boolean,
  currentHeight: number,
): boolean {
  return sheetState === 'half' || sheetState === 'full'
    || (isDragging && currentHeight > SHEET_PEEK_HEIGHT + 30);
}
