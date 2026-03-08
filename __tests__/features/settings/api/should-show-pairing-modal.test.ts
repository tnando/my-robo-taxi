import { describe, it, expect } from 'vitest';

import { shouldShowPairingModal } from '@/features/settings/utils';

import type { UserSettings } from '@/features/settings/types';

const baseSettings: UserSettings = {
  name: 'Jane',
  email: 'jane@example.com',
  teslaLinked: true,
  virtualKeyPaired: false,
  keyPairingReminderCount: 0,
  notifications: {
    driveStarted: true,
    driveCompleted: true,
    chargingComplete: false,
    viewerJoined: true,
  },
};

function settings(overrides?: Partial<UserSettings>): UserSettings {
  return { ...baseSettings, ...overrides };
}

describe('shouldShowPairingModal', () => {
  it('returns true when Tesla linked and key not paired', () => {
    expect(shouldShowPairingModal(settings())).toBe(true);
  });

  it('returns false when Tesla is not linked', () => {
    expect(shouldShowPairingModal(settings({ teslaLinked: false }))).toBe(false);
  });

  it('returns false when key is already paired', () => {
    expect(shouldShowPairingModal(settings({ virtualKeyPaired: true }))).toBe(false);
  });

  it('returns false after 3 reminders', () => {
    expect(
      shouldShowPairingModal(settings({ keyPairingReminderCount: 3 })),
    ).toBe(false);
  });

  it('returns true with fewer than 3 reminders', () => {
    expect(
      shouldShowPairingModal(settings({ keyPairingReminderCount: 2 })),
    ).toBe(true);
  });

  it('returns false after 14 days since first deferral', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      shouldShowPairingModal(
        settings({ keyPairingDeferredAt: fifteenDaysAgo, keyPairingReminderCount: 1 }),
      ),
    ).toBe(false);
  });

  it('returns true within 14 days of first deferral', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      shouldShowPairingModal(
        settings({ keyPairingDeferredAt: fiveDaysAgo, keyPairingReminderCount: 1 }),
      ),
    ).toBe(true);
  });

  it('returns true when never deferred', () => {
    expect(
      shouldShowPairingModal(settings({ keyPairingDeferredAt: undefined })),
    ).toBe(true);
  });
});
