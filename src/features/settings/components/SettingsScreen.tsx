'use client';

import { useState, useTransition } from 'react';

import type { UserSettings } from '../types';

import { ToggleSwitch } from './ToggleSwitch';
import { UnlinkConfirmDialog } from './UnlinkConfirmDialog';

/** Props for the SettingsScreen component. */
export interface SettingsScreenProps {
  /** User settings data. */
  settings: UserSettings;
  /** Callback to sign the user out. */
  onSignOut: () => void;
  /** Callback to initiate Tesla account linking. */
  onLinkTesla: () => void;
  /** Callback to unlink the Tesla account. */
  onUnlinkTesla: () => void;
  /** Optional callback when a notification toggle changes. */
  onToggle?: (key: keyof UserSettings['notifications'], value: boolean) => void;
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
export function SettingsScreen({
  settings,
  onSignOut,
  onLinkTesla,
  onUnlinkTesla,
  onToggle,
}: SettingsScreenProps) {
  const [notifications, setNotifications] = useState(settings.notifications);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unlinkSuccess, setUnlinkSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (key: keyof UserSettings['notifications']) => {
    const newValue = !notifications[key];
    setNotifications((prev) => ({ ...prev, [key]: newValue }));
    onToggle?.(key, newValue);
  };

  const handleUnlinkConfirm = () => {
    startTransition(async () => {
      await onUnlinkTesla();
      setShowConfirm(false);
      setUnlinkSuccess(true);
    });
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${
                settings.teslaLinked && !unlinkSuccess ? 'bg-status-driving' : 'bg-text-muted'
              }`}
            />
            <p className="text-text-primary text-sm font-light">
              {unlinkSuccess
                ? 'Tesla account unlinked'
                : settings.teslaLinked
                  ? `Linked to ${settings.teslaVehicleName ?? 'Tesla'}`
                  : 'Not linked'}
            </p>
          </div>
          {settings.teslaLinked && !unlinkSuccess ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="text-text-muted text-sm font-light hover:text-red-400 transition-colors"
            >
              Unlink
            </button>
          ) : (
            <form action={onLinkTesla}>
              <button
                type="submit"
                className="text-accent-gold text-sm font-medium hover:text-accent-gold/80 transition-colors"
              >
                Link
              </button>
            </form>
          )}
        </div>
      </div>

      <UnlinkConfirmDialog
        open={showConfirm}
        loading={isPending}
        onConfirm={handleUnlinkConfirm}
        onCancel={() => setShowConfirm(false)}
      />

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
        <form action={onSignOut}>
          <button
            type="submit"
            className="text-text-muted text-sm font-light hover:text-text-secondary transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>

      {/* Version */}
      <div className="px-6">
        <p className="text-text-muted/50 text-xs font-light">MyRoboTaxi v1.0</p>
      </div>
    </div>
  );
}
