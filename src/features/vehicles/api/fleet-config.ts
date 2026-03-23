import { SignJWT } from 'jose';

const TELEMETRY_API_URL = process.env.TELEMETRY_API_URL;
const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');

/**
 * Push fleet telemetry config for a vehicle via the telemetry server.
 * Called after virtual key pairing is detected during sync.
 * Idempotent — safe to call multiple times (server returns 409 if already configured).
 */
export async function pushFleetConfig(userId: string, vin: string): Promise<void> {
  if (!TELEMETRY_API_URL) {
    console.warn('[fleet-config] TELEMETRY_API_URL not set — skipping fleet config push');
    return;
  }

  // Sign a JWT with the same AUTH_SECRET the telemetry server validates
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(AUTH_SECRET);

  const url = `${TELEMETRY_API_URL}/api/fleet-config/${encodeURIComponent(vin)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    console.log(`[fleet-config] Config pushed for VIN ***${vin.slice(-4)}`);
    return;
  }

  if (res.status === 409) {
    console.log(`[fleet-config] Already configured for VIN ***${vin.slice(-4)}`);
    return;
  }

  // Log error but don't throw — fleet config push failure should not break sync
  const body = await res.text().catch(() => '');
  console.error(
    `[fleet-config] Push failed for VIN ***${vin.slice(-4)}: ${res.status} ${body}`,
  );
}
