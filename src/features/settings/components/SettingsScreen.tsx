'use client';

import { useState } from 'react';

import type { UserSettings } from '../types';

import { ToggleSwitch } from './ToggleSwitch';

/** Props for the SettingsScreen component. */
export interface SettingsScreenProps {
  /** User settings data. */
  settings: UserSettings;
  /** Callback to sign the user out. */
  onSignOut: () => void;
}

/** Notification toggle item shape. */
interface NotificationItem {
  key: keyof UserSettings['notifications'];
  label: string;
}

const NOTIFICATION_ITEMS: NotificationItem[] = [
  { key: 'driveStarted', label: 'Drive started' },
  { key: 'driveCompleted', label: 'Drive completed' },
  { key: 'chargingComplete', label: 'Charging complete' },
  { key: 'viewerJoined', label: 'Viewer joined' },
];

/**
 * Settings screen — profile info, Tesla link status, notification toggles, sign out.
 * Matches ui-mocks/src/pages/Settings.tsx pixel-for-pixel.
 */
export function SettingsScreen({ settings, onSignOut }: SettingsScreenProps) {
  const [notifications, setNotifications] = useState(settings.notifications);

  const handleToggle = (key: keyof UserSettings['notifications']) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* Header */}
      <header className="px-6 pt-16 pb-10">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h1>
      </header>

      {/* Profile */}
      <div className="px-6 mb-10">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-4">
          Profile
        </p>
        <div className="space-y-1">
          <p className="text-text-primary text-base font-medium">{settings.name}</p>
          <p className="text-text-muted text-sm font-light">{settings.email}</p>
        </div>
      </div>

      {/* Tesla Account */}
      <div className="px-6 mb-10">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-4">
          Tesla Account
        </p>
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              settings.teslaLinked ? 'bg-status-driving' : 'bg-text-muted'
            }`}
          />
          <p className="text-text-primary text-sm font-light">
            {settings.teslaLinked
              ? `Linked to ${settings.teslaVehicleName ?? 'Tesla'}`
              : 'Not linked'}
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="px-6 mb-10">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-5">
          Notifications
        </p>
        <div className="space-y-5">
          {NOTIFICATION_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-text-primary text-sm font-light">{item.label}</span>
              <ToggleSwitch
                enabled={notifications[item.key]}
                onToggle={() => handleToggle(item.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      <div className="px-6 mb-6">
        <button
          type="button"
          onClick={onSignOut}
          className="text-text-muted text-sm font-light hover:text-text-secondary transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Version */}
      <div className="px-6">
        <p className="text-text-muted/50 text-xs font-light">MyRoboTaxi v1.0</p>
      </div>
    </div>
  );
}
