/** Props for the Skeleton loading placeholder. */
export interface SkeletonProps {
  /** Additional Tailwind classes for width/height (e.g., "w-24 h-4"). */
  className?: string;
}

/**
 * Shimmer loading placeholder with a subtle gold-tinted sweep.
 * Matches the dark theme — base is bg-elevated with a translucent gold highlight.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-bg-elevated ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(201, 168, 76, 0.08) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}
