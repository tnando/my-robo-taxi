'use server';

import { SignJWT } from 'jose';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTeslaAccessToken } from '@/lib/tesla';
import { getFleetStatus } from '@/lib/tesla-client';
import { JWT_ISSUER, JWT_AUDIENCE } from '@/lib/constants';

import type { SetupStatus } from '@/types/vehicle';

// ─── Internal JWT signing ─────────────────────────────────────────────────────

async function signTelemetryJwt(userId: string): Promise<string | null> {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return null;

  const secret = new TextEncoder().encode(authSecret);
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret);
}

// ─── Update setupStatus in DB ─────────────────────────────────────────────────

/**
 * Persist the latest setup status for a vehicle.
 * Only updates if the new status is different (forward-progress guard).
 */
export async function updateSetupStatus(
  vehicleId: string,
  status: SetupStatus,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.vehicle.updateMany({
    where: { id: vehicleId, userId: session.user.id },
    data: { setupStatus: status },
  });
}

// ─── Step 1: Pairing check ────────────────────────────────────────────────────

export interface PairingCheckResult {
  paired: boolean;
  /** True when Tesla Fleet API returned an unexpected error. */
  error: boolean;
  /** True when the user's Tesla OAuth token is expired. */
  tokenExpired: boolean;
}

/**
 * Check whether the virtual key has been paired for a VIN.
 * Calls Tesla fleet_status API server-side using the stored OAuth token.
 */
export async function checkPairingStatus(vin: string): Promise<PairingCheckResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { paired: false, error: false, tokenExpired: true };
  }

  let accessToken: string | null;
  try {
    accessToken = await getTeslaAccessToken(session.user.id);
  } catch {
    return { paired: false, error: false, tokenExpired: true };
  }

  if (!accessToken) {
    return { paired: false, error: false, tokenExpired: true };
  }

  const result = await getFleetStatus(accessToken, vin);
  if (result === null) {
    return { paired: false, error: true, tokenExpired: false };
  }

  return { paired: result, error: false, tokenExpired: false };
}

// ─── Step 3: Vehicle connection check ────────────────────────────────────────

export interface VehicleConnectionResult {
  /** True when the telemetry server has received data for this VIN. */
  connected: boolean;
  /** True when the request to the telemetry server failed. */
  error: boolean;
}

/**
 * Check whether the telemetry server has received data for a VIN.
 * Calls GET /api/vehicle-status/{vin} on the telemetry server.
 */
export async function checkVehicleConnection(
  vehicleId: string,
  vin: string,
): Promise<VehicleConnectionResult> {
  const session = await auth();
  if (!session?.user?.id) return { connected: false, error: true };

  const telemetryApiUrl = process.env.TELEMETRY_API_URL;
  if (!telemetryApiUrl) return { connected: false, error: false };

  const token = await signTelemetryJwt(session.user.id);
  if (!token) return { connected: false, error: true };

  try {
    const url = `${telemetryApiUrl}/api/vehicle-status/${encodeURIComponent(vin)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });

    if (res.status === 404) return { connected: false, error: false };
    if (!res.ok) return { connected: false, error: true };

    const data = (await res.json()) as { connected?: boolean };
    const isConnected = data.connected === true;

    if (isConnected) {
      await updateSetupStatus(vehicleId, 'connected');
    }

    return { connected: isConnected, error: false };
  } catch {
    return { connected: false, error: true };
  }
}
