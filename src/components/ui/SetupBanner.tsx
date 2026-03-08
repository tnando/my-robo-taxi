'use client';

/** Props for the SetupBanner component. */
export interface SetupBannerProps {
  /** Banner heading. */
  title: string;
  /** Short explanation of what the user needs to do. */
  description: string;
  /** Button label. */
  actionLabel: string;
  /** Callback when the action button is pressed. */
  onAction: () => void;
  /** Optional dismiss callback. When provided, shows a close button. */
  onDismiss?: () => void;
}

/**
 * Informational banner prompting the user to complete Tesla setup.
 * Uses gold accent to match the app's premium Tesla design language.
 */
export function SetupBanner({
  title,
  description,
  actionLabel,
  onAction,
  onDismiss,
}: SetupBannerProps) {
  return (
    <div
      role="status"
      className="bg-bg-surface border border-border-default rounded-xl px-4 py-3 animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <KeyIcon />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="text-xs font-light text-text-secondary mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="px-3 py-1.5 rounded-lg border border-accent-gold text-accent-gold text-xs font-medium hover:bg-accent-gold/10 transition-colors whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-text-muted hover:text-text-secondary transition-colors shrink-0 -mr-1"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/** Gold key icon for the setup banner. */
function KeyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="text-accent-gold shrink-0 mt-0.5"
      aria-hidden="true"
    >
      <path
        d="M12.5 2.5a4.5 4.5 0 0 0-4.37 5.57L3 13.2V17h3.8l.7-.7v-1.8h1.8l.7-.7v-1.8h1.13l1.07-1.07A4.5 4.5 0 1 0 12.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
