import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetTeslaAccessToken = vi.fn();
vi.mock('@/lib/tesla', () => ({
  TESLA_AUDIENCE: 'https://fleet-api.test.tesla.com',
  getTeslaAccessToken: (...args: unknown[]) => mockGetTeslaAccessToken(...args),
}));

const mockGetFleetStatus = vi.fn();
vi.mock('@/lib/tesla-client', () => ({
  getFleetStatus: (...args: unknown[]) => mockGetFleetStatus(...args),
}));

const mockVehicleUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
vi.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: {
      updateMany: (...args: unknown[]) => mockVehicleUpdateMany(...args),
    },
  },
}));

const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { checkPairingStatus, checkVehicleConnection, updateSetupStatus } from '@/features/vehicles/api/setup-actions';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('updateSetupStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockVehicleUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('calls prisma.vehicle.updateMany with correct args', async () => {
    await updateSetupStatus('vehicle-1', 'pairing_detected');

    expect(mockVehicleUpdateMany).toHaveBeenCalledWith({
      where: { id: 'vehicle-1', userId: 'user-1' },
      data: { setupStatus: 'pairing_detected' },
    });
  });

  it('does nothing when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await updateSetupStatus('vehicle-1', 'connected');
    expect(mockVehicleUpdateMany).not.toHaveBeenCalled();
  });
});

describe('checkPairingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
  });

  it('returns tokenExpired when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await checkPairingStatus('VIN1');
    expect(result).toEqual({ paired: false, error: false, tokenExpired: true });
  });

  it('returns tokenExpired when no access token', async () => {
    mockGetTeslaAccessToken.mockResolvedValue(null);
    const result = await checkPairingStatus('VIN1');
    expect(result).toEqual({ paired: false, error: false, tokenExpired: true });
  });

  it('returns tokenExpired when getTeslaAccessToken throws', async () => {
    mockGetTeslaAccessToken.mockRejectedValue(new Error('token refresh failed'));
    const result = await checkPairingStatus('VIN1');
    expect(result).toEqual({ paired: false, error: false, tokenExpired: true });
  });

  it('returns paired: true when fleet_status confirms pairing', async () => {
    mockGetFleetStatus.mockResolvedValue(true);
    const result = await checkPairingStatus('VIN1');
    expect(result).toEqual({ paired: true, error: false, tokenExpired: false });
  });

  it('returns paired: false when fleet_status reports not paired', async () => {
    mockGetFleetStatus.mockResolvedValue(false);
    const result = await checkPairingStatus('VIN1');
    expect(result).toEqual({ paired: false, error: false, tokenExpired: false });
  });

  it('returns error: true when fleet_status returns null', async () => {
    mockGetFleetStatus.mockResolvedValue(null);
    const result = await checkPairingStatus('VIN1');
    expect(result).toEqual({ paired: false, error: true, tokenExpired: false });
  });
});

describe('checkVehicleConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    process.env.AUTH_SECRET = 'test-secret-long-enough-for-hs256-signing';
    process.env.TELEMETRY_API_URL = 'https://telemetry.test.example.com';
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await checkVehicleConnection('v1', 'VIN1');
    expect(result).toEqual({ connected: false, error: true });
  });

  it('returns connected: false (no error) when TELEMETRY_API_URL is not set', async () => {
    delete process.env.TELEMETRY_API_URL;
    const result = await checkVehicleConnection('v1', 'VIN1');
    expect(result).toEqual({ connected: false, error: false });
    process.env.TELEMETRY_API_URL = 'https://telemetry.test.example.com';
  });

  it('returns connected: false when server returns 404', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const result = await checkVehicleConnection('v1', 'VIN1');
    expect(result).toEqual({ connected: false, error: false });
  });

  it('returns error when server returns 500', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await checkVehicleConnection('v1', 'VIN1');
    expect(result).toEqual({ connected: false, error: true });
  });

  it('returns connected: true when server confirms connection', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ connected: true }),
    });
    const result = await checkVehicleConnection('v1', 'VIN1');
    expect(result).toEqual({ connected: true, error: false });
  });

  it('returns connected: false when server says not connected', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ connected: false }),
    });
    const result = await checkVehicleConnection('v1', 'VIN1');
    expect(result).toEqual({ connected: false, error: false });
  });

  it('updates setupStatus to connected when server confirms', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ connected: true }),
    });
    await checkVehicleConnection('v1', 'VIN1');
    expect(mockVehicleUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { setupStatus: 'connected' } }),
    );
  });

  it('returns error on fetch exception', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await checkVehicleConnection('v1', 'VIN1');
    expect(result).toEqual({ connected: false, error: true });
  });
});
