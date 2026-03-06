import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock tesla.ts before importing tesla-client
vi.mock('@/lib/tesla', () => ({
  TESLA_AUDIENCE: 'https://fleet-api.test.tesla.com',
}));

import {
  TeslaApiError,
  fetchWithRetry,
  listVehicles,
  getVehicleData,
  wakeVehicle,
} from '@/lib/tesla-client';

const BASE = 'https://fleet-api.test.tesla.com';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── fetchWithRetry ──────────────────────────────────────────────────────────

describe('fetchWithRetry', () => {
  it('returns response on success', async () => {
    const mockRes = { ok: true, status: 200 } as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));

    const res = await fetchWithRetry('https://example.com', {});
    expect(res).toBe(mockRes);
  });

  it('throws non-retryable error on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    await expect(fetchWithRetry('https://example.com', {})).rejects.toThrow(
      TeslaApiError,
    );

    try {
      await fetchWithRetry('https://example.com', {});
    } catch (err) {
      expect(err).toBeInstanceOf(TeslaApiError);
      expect((err as TeslaApiError).statusCode).toBe(401);
      expect((err as TeslaApiError).retryable).toBe(false);
    }
  });

  it('throws retryable error on 408', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 408 }),
    );

    try {
      await fetchWithRetry('https://example.com', {});
    } catch (err) {
      expect(err).toBeInstanceOf(TeslaApiError);
      expect((err as TeslaApiError).statusCode).toBe(408);
      expect((err as TeslaApiError).retryable).toBe(true);
    }
  });

  it('retries on 429 with Retry-After header', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '1' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchWithRetry('https://example.com', {});
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 with backoff', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchWithRetry('https://example.com', {});
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on network error', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchWithRetry('https://example.com', {});
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network failure')),
    );

    await expect(
      fetchWithRetry('https://example.com', {}, 3),
    ).rejects.toThrow('Network error after 3 retries');
  });

  it('throws after max retries on 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(
      fetchWithRetry('https://example.com', {}, 3),
    ).rejects.toThrow('Server error 500 after max retries');
  });
});

// ─── listVehicles ────────────────────────────────────────────────────────────

describe('listVehicles', () => {
  it('calls correct endpoint with auth header and returns vehicles', async () => {
    const vehicles = [
      { id: 1, vehicle_id: 100, vin: 'VIN1', display_name: 'Car', state: 'online' },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: vehicles }),
      }),
    );

    const result = await listVehicles('test-token');

    expect(result).toEqual(vehicles);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/1/vehicles`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });
});

// ─── getVehicleData ──────────────────────────────────────────────────────────

describe('getVehicleData', () => {
  it('calls correct endpoint with endpoints query param', async () => {
    const vehicleData = {
      id: 1,
      vin: 'VIN1',
      drive_state: {},
      charge_state: {},
      vehicle_state: {},
      climate_state: {},
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: vehicleData }),
      }),
    );

    await getVehicleData('test-token', 42);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/1/vehicles/42/vehicle_data?endpoints='),
      expect.anything(),
    );
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('charge_state');
    expect(url).toContain('drive_state');
    expect(url).toContain('vehicle_state');
    expect(url).toContain('climate_state');
  });
});

// ─── wakeVehicle ─────────────────────────────────────────────────────────────

describe('wakeVehicle', () => {
  it('sends POST to wake_up endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
    );

    await wakeVehicle('test-token', 42);

    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/1/vehicles/42/wake_up`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
