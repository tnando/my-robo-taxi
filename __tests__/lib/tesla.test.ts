import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  TESLA_AUTH_URL,
  TESLA_TOKEN_URL,
  TESLA_USERINFO_URL,
  TESLA_AUDIENCE,
  TESLA_SCOPES,
  refreshTeslaToken,
  getTeslaAccessToken,
} from '@/lib/tesla';

// ─── Mock prisma ────────────────────────────────────────────────────────────

const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ─── Constants ──────────────────────────────────────────────────────────────

describe('Tesla constants', () => {
  it('exports correct authorization URL', () => {
    expect(TESLA_AUTH_URL).toBe('https://auth.tesla.com/oauth2/v3/authorize');
  });

  it('exports correct token URL', () => {
    expect(TESLA_TOKEN_URL).toBe(
      'https://auth.tesla.com/oauth2/v3/token',
    );
  });

  it('exports correct userinfo URL', () => {
    expect(TESLA_USERINFO_URL).toBe(
      'https://auth.tesla.com/oauth2/v3/userinfo',
    );
  });

  it('exports correct audience', () => {
    expect(TESLA_AUDIENCE).toBe('https://fleet-api.prd.na.vn.cloud.tesla.com');
  });

  it('includes required scopes', () => {
    expect(TESLA_SCOPES).toContain('openid');
    expect(TESLA_SCOPES).toContain('offline_access');
    expect(TESLA_SCOPES).toContain('vehicle_device_data');
    expect(TESLA_SCOPES).toContain('vehicle_location');
  });
});

// ─── refreshTeslaToken ──────────────────────────────────────────────────────

describe('refreshTeslaToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTH_TESLA_ID: 'test-client-id',
      AUTH_TESLA_SECRET: 'test-client-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws when credentials are missing', async () => {
    process.env.AUTH_TESLA_ID = '';
    process.env.AUTH_TESLA_SECRET = '';

    await expect(refreshTeslaToken('rt_abc')).rejects.toThrow(
      'Tesla OAuth credentials not configured',
    );
  });

  it('exchanges refresh token and returns new token set', async () => {
    const tokenResponse = {
      access_token: 'new_at',
      refresh_token: 'new_rt',
      expires_in: 3600,
      token_type: 'Bearer',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(tokenResponse),
      }),
    );

    const result = await refreshTeslaToken('old_rt');

    expect(result).toEqual(tokenResponse);
    expect(fetch).toHaveBeenCalledWith(TESLA_TOKEN_URL, expect.objectContaining({
      method: 'POST',
    }));
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    await expect(refreshTeslaToken('bad_rt')).rejects.toThrow(
      'Tesla token refresh failed: 401',
    );
  });
});

// ─── getTeslaAccessToken ────────────────────────────────────────────────────

describe('getTeslaAccessToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTH_TESLA_ID: 'test-client-id',
      AUTH_TESLA_SECRET: 'test-client-secret',
    };
    mockFindFirst.mockReset();
    mockUpdate.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns null when no Tesla account exists', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getTeslaAccessToken('user-1');

    expect(result).toBeNull();
  });

  it('returns null when account has no access token', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'acc-1',
      access_token: null,
      refresh_token: 'rt',
      expires_at: null,
    });

    const result = await getTeslaAccessToken('user-1');

    expect(result).toBeNull();
  });

  it('returns existing token when not expired', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

    mockFindFirst.mockResolvedValue({
      id: 'acc-1',
      access_token: 'valid_at',
      refresh_token: 'rt',
      expires_at: futureExpiry,
    });

    const result = await getTeslaAccessToken('user-1');

    expect(result).toBe('valid_at');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('refreshes token when expired', async () => {
    const pastExpiry = Math.floor(Date.now() / 1000) - 100;

    mockFindFirst.mockResolvedValue({
      id: 'acc-1',
      access_token: 'old_at',
      refresh_token: 'old_rt',
      expires_at: pastExpiry,
    });

    const newTokens = {
      access_token: 'new_at',
      refresh_token: 'new_rt',
      expires_in: 3600,
      token_type: 'Bearer',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(newTokens),
      }),
    );

    mockUpdate.mockResolvedValue({});

    const result = await getTeslaAccessToken('user-1');

    expect(result).toBe('new_at');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'acc-1' },
        data: expect.objectContaining({
          access_token: 'new_at',
          refresh_token: 'new_rt',
        }),
      }),
    );
  });

  it('refreshes token within 5-minute buffer', async () => {
    // Expires in 4 minutes — within the 5-minute buffer, should refresh
    const nearExpiry = Math.floor(Date.now() / 1000) + 240;

    mockFindFirst.mockResolvedValue({
      id: 'acc-1',
      access_token: 'soon_at',
      refresh_token: 'rt',
      expires_at: nearExpiry,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'refreshed_at',
            refresh_token: 'new_rt',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
      }),
    );

    mockUpdate.mockResolvedValue({});

    const result = await getTeslaAccessToken('user-1');

    expect(result).toBe('refreshed_at');
  });
});
