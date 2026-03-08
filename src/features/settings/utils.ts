import type { UserSettings } from './types';

/** Max times to auto-show the pairing modal before giving up. */
const MAX_PAIRING_REMINDERS = 3;

/** Days after first deferral to stop auto-showing the modal. */
const PAIRING_DEFERRAL_WINDOW_DAYS = 14;

/**
 * Check whether the pairing modal should auto-show.
 * Returns true when Tesla is linked, key is not paired, and
 * the user hasn't exceeded the reminder limit or time window.
 */
export function shouldShowPairingModal(settings: UserSettings): boolean {
  if (!settings.teslaLinked || settings.virtualKeyPaired) return false;
  if (settings.keyPairingReminderCount >= MAX_PAIRING_REMINDERS) return false;

  if (settings.keyPairingDeferredAt) {
    const deferredAt = new Date(settings.keyPairingDeferredAt);
    const daysSinceFirst =
      (Date.now() - deferredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceFirst >= PAIRING_DEFERRAL_WINDOW_DAYS) return false;
  }

  return true;
}
