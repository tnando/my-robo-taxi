/**
 * Tesla Fleet API HTTP client with retry logic.
 * Pure HTTP — no Prisma, no React.
 */

import { TESLA_AUDIENCE } from '@/lib/tesla';

const BASE_URL = TESLA_AUDIENCE;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

// ─── Error ───────────────────────────────────────────────────────────────────

export class TeslaApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'TeslaApiError';
  }
}

// ─── Response types ──────────────────────────────────────────────────────────

export interface TeslaDriveState {
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  speed: number | null;
  shift_state: string | null;
}

export interface TeslaChargeState {
  battery_level: number | null;
  battery_range: number | null;
  charging_state: string | null;
}

export interface TeslaVehicleState {
  odometer: number | null;
  vehicle_name: string | null;
}

export interface TeslaClimateState {
  inside_temp: number | null;
  outside_temp: number | null;
}

export interface TeslaVehicleListItem {
  id: number;
  vehicle_id: number;
  vin: string;
  display_name: string | null;
  state: string;
}

export interface TeslaVehicleData {
  id: number;
  vehicle_id: number;
  vin: string;
  display_name: string | null;
  state: string;
  in_service: boolean;
  drive_state?: TeslaDriveState;
  charge_state?: TeslaChargeState;
  vehicle_state?: TeslaVehicleState;
  climate_state?: TeslaClimateState;
}

// ─── Internal fetch with retry ───────────────────────────────────────────────

function jitter(): number {
  return Math.floor(Math.random() * 500);
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt = 0,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw new TeslaApiError(
        `Network error after ${MAX_RETRIES} retries: ${String(error)}`,
        0,
        false,
      );
    }
    const delay = Math.min(BASE_DELAY_MS * 2 ** attempt + jitter(), MAX_DELAY_MS);
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, attempt + 1);
  }

  if (res.ok) return res;

  if (res.status === 401) {
    throw new TeslaApiError('Unauthorized — token expired or revoked', 401, false);
  }

  if (res.status === 403 || res.status === 412) {
    throw new TeslaApiError(
      `Tesla API access denied: ${res.status} — check fleet setup and token scopes`,
      res.status,
      false,
    );
  }

  if (res.status === 408) {
    throw new TeslaApiError('Vehicle is asleep', 408, true);
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY_MS;
    if (attempt >= MAX_RETRIES) {
      throw new TeslaApiError('Rate limited after max retries', 429, false);
    }
    await new Promise((r) => setTimeout(r, waitMs));
    return fetchWithRetry(url, options, attempt + 1);
  }

  if (res.status >= 500) {
    if (attempt >= MAX_RETRIES) {
      throw new TeslaApiError(`Server error ${res.status} after max retries`, res.status, false);
    }
    const delay = Math.min(BASE_DELAY_MS * 2 ** attempt + jitter(), MAX_DELAY_MS);
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, attempt + 1);
  }

  throw new TeslaApiError(`Tesla API error: ${res.status}`, res.status, false);
}

// ─── API methods ─────────────────────────────────────────────────────────────

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function listVehicles(
  accessToken: string,
): Promise<TeslaVehicleListItem[]> {
  const res = await fetchWithRetry(`${BASE_URL}/api/1/vehicles`, {
    headers: authHeaders(accessToken),
  });
  const data = (await res.json()) as { response: TeslaVehicleListItem[] };
  return data.response;
}

export async function getVehicleData(
  accessToken: string,
  vehicleId: number,
): Promise<TeslaVehicleData> {
  const endpoints = 'charge_state;climate_state;drive_state;location_data;vehicle_state';
  const res = await fetchWithRetry(
    `${BASE_URL}/api/1/vehicles/${vehicleId}/vehicle_data?endpoints=${endpoints}`,
    { headers: authHeaders(accessToken) },
  );
  const data = (await res.json()) as { response: TeslaVehicleData };
  // TODO(#127): remove diagnostic logging once virtual key issue is resolved
  const raw = data.response as unknown as Record<string, unknown>;
  const rawKeys = Object.keys(raw).sort().join(', ');
  console.info(`[tesla-client] vehicle_data for ${vehicleId}: raw_keys=[${rawKeys}] | granular_access=${JSON.stringify(raw['granular_access'])} | access_type=${String(raw['access_type'])}`);
  return data.response;
}

export async function getFleetStatus(
  accessToken: string,
  vin: string,
): Promise<boolean | null> {
  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/api/1/vehicles/fleet_status`,
      {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ vins: [vin] }),
      },
    );
    const data = (await res.json()) as {
      response?: { [vin: string]: { key_paired?: boolean } };
    };
    // TODO(#127): remove diagnostic logging once virtual key issue is resolved
    console.info(`[tesla-client] fleet_status for ${vin}: ${JSON.stringify(data)}`);
    return data.response?.[vin]?.key_paired === true;
  } catch (err) {
    console.error(`[tesla-client] fleet_status for ${vin} failed:`, err);
    return null; // Unknown — caller should preserve existing DB value
  }
}

export async function wakeVehicle(
  accessToken: string,
  vehicleId: number,
): Promise<void> {
  await fetchWithRetry(`${BASE_URL}/api/1/vehicles/${vehicleId}/wake_up`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}
