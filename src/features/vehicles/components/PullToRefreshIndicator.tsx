'use client';

/** Props for the PullToRefreshIndicator component. */
export interface PullToRefreshIndicatorProps {
  /** Current pull distance in pixels (0 = hidden). */
  pullDistance: number;
}

/** Animated refresh spinner that follows the user's pull-down gesture. */
export function PullToRefreshIndicator({ pullDistance }: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0) return null;

  return (
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
  );
}
