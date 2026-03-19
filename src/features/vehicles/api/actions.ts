'use server';

import { revalidatePath } from 'next/cache';
import { SignJWT } from 'jose';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Vehicle } from '@/types/vehicle';

import { syncVehiclesFromTesla, STALENESS_THRESHOLD_MS } from './sync';
import { mapPrismaVehicleToVehicle } from './vehicle-mappers';

/** Shared secret for signing WebSocket auth tokens. */
const WS_TOKEN_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? '',
);

/**
 * Generate a short-lived signed JWT for WebSocket authentication.
 * The token contains the user ID and expires in 1 hour.
 * Returns null if the user is not authenticated.
 */
export async function generateWsToken(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const token = await new SignJWT({ sub: session.user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(WS_TOKEN_SECRET);

  return token;
}

/**
 * Fetch all vehicles for the currently authenticated user.
 * Triggers a sync from Tesla if data is stale (>30s old).
 * Returns an empty array if the user is not authenticated.
 */
export async function getVehicles(): Promise<Vehicle[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  // Check staleness and sync if needed
  try {
    const latest = await prisma.vehicle.findFirst({
      where: { userId: session.user.id },
      orderBy: { lastUpdated: 'desc' },
      select: { lastUpdated: true },
    });

    const isStale =
      !latest || Date.now() - latest.lastUpdated.getTime() > STALENESS_THRESHOLD_MS;

    if (isStale) {
      await syncVehiclesFromTesla(session.user.id);
    }
  } catch (err) {
    console.error('[getVehicles] Sync failed, serving cached data:', err);
  }

  const prismaVehicles = await prisma.vehicle.findMany({
    where: { userId: session.user.id },
    include: { stops: true },
    orderBy: { createdAt: 'asc' },
  });

  return prismaVehicles.map(mapPrismaVehicleToVehicle);
}

/**
 * Fetch all vehicles from the database without triggering a Tesla sync.
 * Used for fast initial page renders — the sync runs in the background.
 */
export async function getCachedVehicles(): Promise<Vehicle[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const prismaVehicles = await prisma.vehicle.findMany({
    where: { userId: session.user.id },
    include: { stops: true },
    orderBy: { createdAt: 'asc' },
  });

  return prismaVehicles.map(mapPrismaVehicleToVehicle);
}

/**
 * Sync vehicles from Tesla if data is stale, then revalidate the page.
 * Called from client components as a background server action.
 */
export async function syncVehicles(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  try {
    const latest = await prisma.vehicle.findFirst({
      where: { userId: session.user.id },
      orderBy: { lastUpdated: 'desc' },
      select: { lastUpdated: true },
    });

    const isStale =
      !latest || Date.now() - latest.lastUpdated.getTime() > STALENESS_THRESHOLD_MS;

    if (isStale) {
      await syncVehiclesFromTesla(session.user.id);
      revalidatePath('/');
    }
  } catch (err) {
    console.error('[syncVehicles] Background sync failed:', err);
  }
}

/**
 * Fetch a single vehicle by ID, verifying it belongs to the current user.
 * Returns null if the vehicle is not found or does not belong to the user.
 */
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const prismaVehicle = await prisma.vehicle.findFirst({
    where: { id, userId: session.user.id },
    include: { stops: true },
  });

  if (!prismaVehicle) {
    return null;
  }

  return mapPrismaVehicleToVehicle(prismaVehicle);
}
