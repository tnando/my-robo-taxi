import type { SetupStatus } from '@/types/vehicle';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SetupStep = 1 | 2 | 3 | 4;

export interface SetupStepperState {
  /** Current step (1-4). */
  step: SetupStep;
  /** Whether the current step is polling/loading. */
  isLoading: boolean;
  /** Error message, if the current step has errored. */
  error: string | null;
  /** True after 5 min of waiting in Step 3 (vehicle may be offline). */
  showOfflineHelper: boolean;
  /** True when setup is complete and the banner should be dismissed. */
  isDismissed: boolean;
  /** Retry the current failed step. */
  onRetry: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Exponential backoff settings for Step 1 pairing poll. */
export const PAIRING_POLL_BASE_MS = 3_000;
export const PAIRING_POLL_MAX_MS = 30_000;
export const PAIRING_POLL_MULTIPLIER = 1.5;

/** Fixed interval for Step 3 connection poll (every 5s). */
export const CONNECTION_POLL_INTERVAL_MS = 5_000;

/** Delay (ms) before showing the "vehicle may be offline" helper text. */
export const OFFLINE_HELPER_DELAY_MS = 300_000; // 5 minutes

/** How long to show Step 4 (Connected) before auto-dismissing. */
export const CONNECTED_AUTO_DISMISS_MS = 3_000;

// ─── Status → Step mapping ────────────────────────────────────────────────────

export function statusToStep(status: SetupStatus): SetupStep {
  switch (status) {
    case 'pending_pairing': return 1;
    case 'pairing_detected': return 2;
    case 'config_pushed': return 3;
    case 'waiting_connection': return 3;
    case 'connected': return 4;
  }
}
