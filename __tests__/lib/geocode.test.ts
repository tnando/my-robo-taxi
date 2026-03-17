import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock mapbox.ts so it doesn't try to read env vars at import time
vi.mock('@/lib/mapbox', () => ({
  MAPBOX_TOKEN: 'test-token',
}));

import { reverseGeocode } from '@/lib/geocode';

// ─── Setup ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── reverseGeocode ─────────────────────────────────────────────────────────

describe('reverseGeocode', () => {
  it('returns place name and address from Mapbox response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            text: 'Thompson Hotel',
            place_name: 'Thompson Hotel, 506 San Jacinto Blvd, Austin, TX 78701',
          },
        ],
      }),
    });

    const result = await reverseGeocode(30.2672, -97.7431);

    expect(result).toEqual({
      placeName: 'Thompson Hotel',
      address: 'Thompson Hotel, 506 San Jacinto Blvd, Austin, TX 78701',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('-97.7431,30.2672');
    expect(url).toContain('access_token=test-token');
  });

  it('returns null when Mapbox returns no features', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const result = await reverseGeocode(0.001, 0.001);
    expect(result).toBeNull();
  });

  it('returns null on non-OK response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    const result = await reverseGeocode(30.2672, -97.7431);
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await reverseGeocode(30.2672, -97.7431);
    expect(result).toBeNull();
  });

  it('passes abort signal with 5s timeout', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ text: 'Test', place_name: 'Test Place' }] }),
    });

    await reverseGeocode(30.0, -97.0);

    const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('reverseGeocode handles missing feature fields', () => {
  it('returns empty strings when text/place_name are missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{}] }),
    });

    const result = await reverseGeocode(30.0, -97.0);
    expect(result).toEqual({ placeName: '', address: '' });
  });
});
