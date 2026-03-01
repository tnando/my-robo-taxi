'use client';

import { useAuth } from '@/features/auth';
import { SettingsScreen } from '@/features/settings';

import type { UserSettings } from '@/features/settings';

/**
 * Settings page — user preferences and Tesla account linking.
 * Profile name/email come from the session; other settings are still mock.
 */
export default function SettingsPage() {
  const { user, signOut } = useAuth();

  const settings: UserSettings = {
    name: user?.name ?? '',
    email: user?.email ?? '',
    teslaLinked: false,
    teslaVehicleName: undefined,
    notifications: {
      driveStarted: true,
      driveCompleted: true,
      chargingComplete: false,
      viewerJoined: true,
    },
  };

  return <SettingsScreen settings={settings} onSignOut={signOut} />;
}
