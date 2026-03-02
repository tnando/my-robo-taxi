'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Invite, InvitePermission } from '@/types/invite';
import type { InvitePermission as PrismaInvitePermission } from '@prisma/client';

/**
 * Map Prisma InvitePermission enum to TypeScript InvitePermission type.
 * Prisma uses `live_history` (underscore), TS uses `live+history` (plus).
 */
function mapPermissionFromPrisma(
  prismaPermission: PrismaInvitePermission,
): InvitePermission {
  return prismaPermission === 'live_history' ? 'live+history' : 'live';
}

/**
 * Map TypeScript InvitePermission to Prisma InvitePermission enum.
 */
function mapPermissionToPrisma(
  permission: InvitePermission,
): PrismaInvitePermission {
  return permission === 'live+history' ? 'live_history' : 'live';
}

/**
 * Format a Date as a relative time string (e.g. "2 hours ago", "3 days ago").
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * Fetch all invites sent by the current user.
 * Returns an empty array if the user is not authenticated.
 */
export async function getInvites(): Promise<Invite[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const invites = await prisma.invite.findMany({
    where: { senderId: session.user.id },
    orderBy: { sentDate: 'desc' },
  });

  return invites.map((invite) => ({
    id: invite.id,
    label: invite.label,
    email: invite.email,
    status: invite.status,
    permission: mapPermissionFromPrisma(invite.permission),
    sentDate: invite.sentDate.toISOString().split('T')[0],
    acceptedDate: invite.acceptedDate
      ? invite.acceptedDate.toISOString().split('T')[0]
      : undefined,
    lastSeen: invite.lastSeen
      ? formatRelativeTime(invite.lastSeen)
      : undefined,
    isOnline: invite.isOnline,
  }));
}

/** Input data for creating a new invite. */
interface CreateInviteInput {
  vehicleId: string;
  label: string;
  email: string;
  permission: InvitePermission;
}

/**
 * Create a new invite for the current user.
 * Throws if the user is not authenticated.
 */
export async function createInvite(data: CreateInviteInput): Promise<Invite> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  const invite = await prisma.invite.create({
    data: {
      vehicleId: data.vehicleId,
      senderId: session.user.id,
      label: data.label,
      email: data.email,
      permission: mapPermissionToPrisma(data.permission),
    },
  });

  // TODO (issue #16): Send invite email to data.email

  return {
    id: invite.id,
    label: invite.label,
    email: invite.email,
    status: invite.status,
    permission: mapPermissionFromPrisma(invite.permission),
    sentDate: invite.sentDate.toISOString().split('T')[0],
    acceptedDate: undefined,
    lastSeen: undefined,
    isOnline: invite.isOnline,
  };
}

/**
 * Revoke (delete) an invite. Only the sender can revoke their own invites.
 * Throws if the user is not authenticated or does not own the invite.
 */
export async function revokeInvite(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  const invite = await prisma.invite.findUnique({ where: { id } });
  if (!invite || invite.senderId !== session.user.id) {
    throw new Error('Invite not found');
  }

  await prisma.invite.delete({ where: { id } });
}

/**
 * Resend an invite by updating its sentDate to now.
 * Only the sender can resend their own invites.
 * Throws if the user is not authenticated or does not own the invite.
 */
export async function resendInvite(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  const invite = await prisma.invite.findUnique({ where: { id } });
  if (!invite || invite.senderId !== session.user.id) {
    throw new Error('Invite not found');
  }

  await prisma.invite.update({
    where: { id },
    data: { sentDate: new Date() },
  });

  // TODO (issue #16): Resend invite email to invite.email
}
