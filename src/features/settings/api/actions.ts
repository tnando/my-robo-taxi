'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

import type { UserSettings, NotificationPreferences } from '../types';

/**
 * Map from NotificationPreferences keys to Prisma Settings column names.
 */
const NOTIFICATION_COLUMN_MAP: Record<keyof NotificationPreferences, string> = {
  driveStarted: 'notifyDriveStarted',
  driveCompleted: 'notifyDriveCompleted',
  chargingComplete: 'notifyChargingComplete',
  viewerJoined: 'notifyViewerJoined',
};

/**
 * Fetch the current user's settings, creating defaults if none exist.
 * Returns null if the user is not authenticated.
 */
export async function getSettings(): Promise<UserSettings | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  const [settings, teslaAccount] = await Promise.all([
    prisma.settings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.account.findFirst({
      where: { userId, provider: 'tesla' },
      select: { id: true },
    }),
  ]);

  // Derive teslaLinked from whether a Tesla Account record exists.
  // This is more reliable than the Settings flag alone, which depends
  // on the linkAccount event having fired successfully.
  const teslaLinked = teslaAccount !== null;

  return {
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    teslaLinked,
    teslaVehicleName: settings.teslaVehicleName ?? undefined,
    notifications: {
      driveStarted: settings.notifyDriveStarted,
      driveCompleted: settings.notifyDriveCompleted,
      chargingComplete: settings.notifyChargingComplete,
      viewerJoined: settings.notifyViewerJoined,
    },
  };
}

/**
 * Update the current user's notification preferences.
 * Accepts a partial object so callers can update individual toggles.
 */
export async function updateSettings(
  prefs: Partial<NotificationPreferences>,
): Promise<void> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const data: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(prefs)) {
    const column = NOTIFICATION_COLUMN_MAP[key as keyof NotificationPreferences];
    if (column && typeof value === 'boolean') {
      data[column] = value;
    }
  }

  if (Object.keys(data).length === 0) {
    return;
  }

  await prisma.settings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });
}

/**
 * Unlink the Tesla account for the current user.
 * Deletes the Tesla Account record (removing stored tokens) and
 * clears the teslaLinked flag and vehicle name in Settings.
 */
export async function unlinkTesla(): Promise<void> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const userId = session.user.id;

  await prisma.$transaction([
    prisma.vehicle.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId, provider: 'tesla' } }),
    prisma.settings.upsert({
      where: { userId },
      create: { userId, teslaLinked: false, teslaVehicleName: null },
      update: { teslaLinked: false, teslaVehicleName: null },
    }),
  ]);

  revalidatePath('/settings');
}
