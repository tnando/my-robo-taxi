/**
 * Feature-specific types for the settings domain.
 * Cross-feature types live in @/types/. These are internal to the settings feature.
 */

/** User notification preferences. */
export interface NotificationPreferences {
  driveStarted: boolean;
  driveCompleted: boolean;
  chargingComplete: boolean;
  viewerJoined: boolean;
}

/** User settings data shape. */
export interface UserSettings {
  name: string;
  email: string;
  teslaLinked: boolean;
  teslaVehicleName?: string;
  virtualKeyPaired: boolean;
  keyPairingDeferredAt?: string;
  keyPairingReminderCount: number;
  notifications: NotificationPreferences;
}
