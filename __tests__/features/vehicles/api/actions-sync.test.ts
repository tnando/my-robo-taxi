import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetTeslaAccessToken = vi.fn();
vi.mock('@/lib/tesla', () => ({
  TESLA_AUDIENCE: 'https://fleet-api.test.tesla.com',
  getTeslaAccessToken: (...args: unknown[]) => mockGetTeslaAccessToken(...args),
}));

const mockListVehicles = vi.fn();
const mockGetVehicleData = vi.fn();
const mockWakeVehicle = vi.fn();

vi.mock('@/lib/tesla-client', () => ({
  listVehicles: (...args: unknown[]) => mockListVehicles(...args),
  getVehicleData: (...args: unknown[]) => mockGetVehicleData(...args),
  wakeVehicle: (...args: unknown[]) => mockWakeVehicle(...args),
  TeslaApiError: class TeslaApiError extends Error {
    statusCode: number;
    retryable: boolean;
    constructor(message: string, statusCode: number, retryable: boolean) {
      super(message);
      this.name = 'TeslaApiError';
      this.statusCode = statusCode;
      this.retryable = retryable;
    }
  },
}));

vi.mock('@/lib/tesla-mapper', () => ({
  mapTeslaVehicleToUpsertData: vi.fn().mockReturnValue({
    teslaVehicleId: '123',
    vin: '5YJYE1EA1SF000001',
    name: 'Test Car',
    model: 'Model Y',
    year: 2025,
    chargeLevel: 78,
    estimatedRange: 246,
    status: 'driving',
    speed: 65,
    heading: 280,
    latitude: 30.325,
    longitude: -97.738,
    interiorTemp: 72,
    exteriorTemp: 88,
    odometerMiles: 12847,
  }),
}));

const mockVehicleUpsert = vi.fn();
const mockVehicleFindFirst = vi.fn();
const mockVehicleFindMany = vi.fn();
const mockSettingsUpsert = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: {
      upsert: (...args: unknown[]) => mockVehicleUpsert(...args),
      findFirst: (...args: unknown[]) => mockVehicleFindFirst(...args),
      findMany: (...args: unknown[]) => mockVehicleFindMany(...args),
    },
    settings: {
      upsert: (...args: unknown[]) => mockSettingsUpsert(...args),
    },
  },
}));

const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

import { syncVehiclesFromTesla } from '@/features/vehicles/api/sync';
import { getVehicles } from '@/features/vehicles/api/actions';
import { TeslaApiError } from '@/lib/tesla-client';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Suppress sync completion log in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── syncVehiclesFromTesla ───────────────────────────────────────────────────

describe('syncVehiclesFromTesla', () => {
  it('returns 0 when no Tesla token exists', async () => {
    mockGetTeslaAccessToken.mockResolvedValue(null);

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(0);
    expect(mockListVehicles).not.toHaveBeenCalled();
  });

  it('syncs vehicles successfully', async () => {
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([
      { id: 123, vehicle_id: 456, vin: 'VIN1', display_name: 'Car 1', state: 'online' },
    ]);
    mockGetVehicleData.mockResolvedValue({
      id: 123,
      vin: 'VIN1',
      state: 'online',
      drive_state: {},
      charge_state: {},
      vehicle_state: {},
      climate_state: {},
    });
    mockVehicleUpsert.mockResolvedValue({});
    mockSettingsUpsert.mockResolvedValue({});

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    expect(mockVehicleUpsert).toHaveBeenCalledTimes(1);
    expect(mockVehicleUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teslaVehicleId: '123' },
        create: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
    // drive_state present → virtualKeyPaired should be true
    expect(mockSettingsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({ virtualKeyPaired: true }),
        update: expect.objectContaining({ virtualKeyPaired: true }),
      }),
    );
  });

  it('wakes vehicle on 408 and polls until online', async () => {
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([
      { id: 123, vehicle_id: 456, vin: 'VIN1', display_name: 'Car', state: 'asleep' },
    ]);

    const sleepError = new TeslaApiError('Vehicle is asleep', 408, true);
    mockGetVehicleData
      .mockRejectedValueOnce(sleepError) // initial attempt
      .mockRejectedValueOnce(sleepError) // poll attempt 1 — still asleep
      .mockResolvedValueOnce({           // poll attempt 2 — awake
        id: 123,
        vin: 'VIN1',
        state: 'online',
        drive_state: {},
        charge_state: {},
        vehicle_state: {},
        climate_state: {},
      });
    mockWakeVehicle.mockResolvedValue(undefined);
    mockVehicleUpsert.mockResolvedValue({});
    mockSettingsUpsert.mockResolvedValue({});

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    expect(mockWakeVehicle).toHaveBeenCalledWith('test-token', 123);
    expect(mockGetVehicleData).toHaveBeenCalledTimes(3); // initial + 2 polls
  }, 15_000);

  it('sets virtualKeyPaired false when drive_state is missing', async () => {
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([
      { id: 123, vehicle_id: 456, vin: 'VIN1', display_name: 'Car 1', state: 'online' },
    ]);
    mockGetVehicleData.mockResolvedValue({
      id: 123,
      vin: 'VIN1',
      state: 'online',
      charge_state: { battery_level: 69 },
      // No drive_state, vehicle_state, or climate_state — virtual key not paired
    });
    mockVehicleUpsert.mockResolvedValue({});
    mockSettingsUpsert.mockResolvedValue({});

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    expect(mockSettingsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ virtualKeyPaired: false }),
        update: expect.objectContaining({ virtualKeyPaired: false }),
      }),
    );
  });

  it('continues to next vehicle on per-vehicle error', async () => {
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([
      { id: 1, vehicle_id: 10, vin: 'VIN1', display_name: 'Car 1', state: 'online' },
      { id: 2, vehicle_id: 20, vin: 'VIN2', display_name: 'Car 2', state: 'online' },
    ]);
    const vehicleDataResponse = {
      id: 1,
      vin: 'VIN1',
      state: 'online',
      drive_state: {},
      charge_state: {},
      vehicle_state: {},
      climate_state: {},
    };
    mockGetVehicleData.mockResolvedValue(vehicleDataResponse);
    // First upsert succeeds, second fails
    mockVehicleUpsert
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('DB error'));
    mockSettingsUpsert.mockResolvedValue({});

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[sync] Failed to sync vehicle'),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });

  it('returns synced count even when settings upsert fails', async () => {
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([
      { id: 123, vehicle_id: 456, vin: 'VIN1', display_name: 'Car 1', state: 'online' },
    ]);
    mockGetVehicleData.mockResolvedValue({
      id: 123,
      vin: 'VIN1',
      state: 'online',
      drive_state: {},
      charge_state: {},
      vehicle_state: {},
      climate_state: {},
    });
    mockVehicleUpsert.mockResolvedValue({});
    mockSettingsUpsert.mockRejectedValue(new Error('Settings column missing'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[sync] Failed to update settings'),
      expect.stringContaining('user-1'),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });
});

// ─── getVehicles staleness ───────────────────────────────────────────────────

describe('getVehicles', () => {
  const mockSession = { user: { id: 'user-1' } };

  it('triggers sync when data is stale', async () => {
    mockAuth.mockResolvedValue(mockSession);
    const staleDate = new Date(Date.now() - 60_000);
    mockVehicleFindFirst.mockResolvedValue({ lastUpdated: staleDate });
    mockGetTeslaAccessToken.mockResolvedValue(null);
    mockVehicleFindMany.mockResolvedValue([]);

    await getVehicles();

    expect(mockGetTeslaAccessToken).toHaveBeenCalledWith('user-1');
  });

  it('triggers sync when no vehicles exist', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockVehicleFindFirst.mockResolvedValue(null);
    mockGetTeslaAccessToken.mockResolvedValue(null);
    mockVehicleFindMany.mockResolvedValue([]);

    await getVehicles();

    expect(mockGetTeslaAccessToken).toHaveBeenCalledWith('user-1');
  });

  it('skips sync when data is fresh', async () => {
    mockAuth.mockResolvedValue(mockSession);
    const freshDate = new Date();
    mockVehicleFindFirst.mockResolvedValue({ lastUpdated: freshDate });
    mockVehicleFindMany.mockResolvedValue([]);

    await getVehicles();

    expect(mockGetTeslaAccessToken).not.toHaveBeenCalled();
  });

  it('serves cached data when sync fails and logs the error', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockVehicleFindFirst.mockResolvedValue(null);
    mockGetTeslaAccessToken.mockRejectedValue(new Error('Sync boom'));
    mockVehicleFindMany.mockResolvedValue([]);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await getVehicles();

    expect(result).toEqual([]);
    expect(mockVehicleFindMany).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[getVehicles] Sync failed'),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });

  it('returns empty array when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getVehicles();
    expect(result).toEqual([]);
  });
});
