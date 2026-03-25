import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetTeslaAccessToken = vi.fn();
vi.mock('@/lib/tesla', () => ({
  TESLA_AUDIENCE: 'https://fleet-api.test.tesla.com',
  getTeslaAccessToken: (...args: unknown[]) => mockGetTeslaAccessToken(...args),
}));

const mockListVehicles = vi.fn();
const mockGetVehicleData = vi.fn();
const mockGetFleetStatus = vi.fn();
const mockWakeVehicle = vi.fn();

vi.mock('@/lib/tesla-client', () => ({
  listVehicles: (...args: unknown[]) => mockListVehicles(...args),
  getVehicleData: (...args: unknown[]) => mockGetVehicleData(...args),
  getFleetStatus: (...args: unknown[]) => mockGetFleetStatus(...args),
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
    destinationName: null,
    etaMinutes: null,
    tripDistanceRemaining: null,
  }),
}));

const mockDetectAndRecordDrive = vi.fn();
vi.mock('@/lib/drive-detection', () => ({
  detectAndRecordDrive: (...args: unknown[]) => mockDetectAndRecordDrive(...args),
}));

const mockVehicleUpsert = vi.fn().mockResolvedValue({ id: 'vehicle-1' });
const mockVehicleUpdate = vi.fn().mockResolvedValue({ id: 'vehicle-1' });
const mockVehicleFindUnique = vi.fn();
const mockVehicleFindFirst = vi.fn();
const mockVehicleFindMany = vi.fn();
const mockSettingsUpsert = vi.fn();
const mockUserFindUnique = vi.fn().mockResolvedValue({ id: 'user-1' });

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    vehicle: {
      upsert: (...args: unknown[]) => mockVehicleUpsert(...args),
      update: (...args: unknown[]) => mockVehicleUpdate(...args),
      findUnique: (...args: unknown[]) => mockVehicleFindUnique(...args),
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

const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('@/features/vehicles/api/vehicle-mappers', () => ({
  mapPrismaVehicleToVehicle: vi.fn((v: unknown) => v),
}));

import { syncVehiclesFromTesla } from '@/features/vehicles/api/sync';
import { getVehicles, getCachedVehicles, syncVehicles } from '@/features/vehicles/api/actions';
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
  it('returns 0 when user does not exist', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    const count = await syncVehiclesFromTesla('deleted-user');

    expect(count).toBe(0);
    expect(mockGetTeslaAccessToken).not.toHaveBeenCalled();
  });

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
    mockGetFleetStatus.mockResolvedValue(true);
    mockVehicleUpsert.mockResolvedValue({ id: 'vehicle-1' });
    mockSettingsUpsert.mockResolvedValue({});

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    expect(mockVehicleUpsert).toHaveBeenCalledTimes(1);
    expect(mockVehicleUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teslaVehicleId: '123' },
        create: expect.objectContaining({ userId: 'user-1', virtualKeyPaired: true }),
        update: expect.objectContaining({ virtualKeyPaired: true }),
      }),
    );
    // drive_state present → all vehicles paired → Settings.virtualKeyPaired true
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
    mockGetFleetStatus.mockResolvedValue(true);
    mockVehicleUpsert.mockResolvedValue({ id: 'vehicle-1' });
    mockSettingsUpsert.mockResolvedValue({});

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    expect(mockWakeVehicle).toHaveBeenCalledWith('test-token', 123);
    expect(mockGetVehicleData).toHaveBeenCalledTimes(3); // initial + 2 polls
  }, 15_000);

  it('sets virtualKeyPaired false when fleet_status reports key not paired', async () => {
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([
      { id: 123, vehicle_id: 456, vin: 'VIN1', display_name: 'Car 1', state: 'online' },
    ]);
    mockGetVehicleData.mockResolvedValue({
      id: 123,
      vin: 'VIN1',
      state: 'online',
      charge_state: { battery_level: 69 },
    });
    mockGetFleetStatus.mockResolvedValue(false);
    mockVehicleUpsert.mockResolvedValue({ id: 'vehicle-1' });
    mockSettingsUpsert.mockResolvedValue({});

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    // Vehicle upsert should include virtualKeyPaired: false
    expect(mockVehicleUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ virtualKeyPaired: false }),
        update: expect.objectContaining({ virtualKeyPaired: false }),
      }),
    );
    expect(mockSettingsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ virtualKeyPaired: false }),
        update: expect.objectContaining({ virtualKeyPaired: false }),
      }),
    );
  });

  it('preserves existing virtualKeyPaired when fleet_status fails', async () => {
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([
      { id: 123, vehicle_id: 456, vin: 'VIN1', display_name: 'Car 1', state: 'online' },
    ]);
    mockGetVehicleData.mockResolvedValue({
      id: 123,
      vin: 'VIN1',
      state: 'online',
      charge_state: { battery_level: 80 },
    });
    // fleet_status fails → returns null
    mockGetFleetStatus.mockResolvedValue(null);
    // Existing DB record has virtualKeyPaired: true
    mockVehicleFindUnique.mockResolvedValue({ virtualKeyPaired: true });
    mockVehicleUpsert.mockResolvedValue({ id: 'vehicle-1' });
    mockSettingsUpsert.mockResolvedValue({});

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(1);
    expect(mockVehicleUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ virtualKeyPaired: true }),
      }),
    );
  });

  it('sets Settings.virtualKeyPaired false when only some vehicles are paired', async () => {
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([
      { id: 1, vehicle_id: 10, vin: 'VIN1', display_name: 'Car 1', state: 'online' },
      { id: 2, vehicle_id: 20, vin: 'VIN2', display_name: 'Car 2', state: 'online' },
    ]);
    mockGetVehicleData
      .mockResolvedValueOnce({
        id: 1, vin: 'VIN1', state: 'online',
        drive_state: {}, charge_state: {}, vehicle_state: {}, climate_state: {},
      })
      .mockResolvedValueOnce({
        id: 2, vin: 'VIN2', state: 'online',
        charge_state: { battery_level: 50 },
      });
    // First vehicle paired, second not
    mockGetFleetStatus.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockVehicleUpsert.mockResolvedValue({ id: 'vehicle-1' });
    mockSettingsUpsert.mockResolvedValue({});

    const count = await syncVehiclesFromTesla('user-1');

    expect(count).toBe(2);
    // Settings should be false because not ALL vehicles are paired
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
    mockGetFleetStatus.mockResolvedValue(true);
    // First upsert succeeds, second fails
    mockVehicleUpsert
      .mockResolvedValueOnce({ id: 'vehicle-1' })
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
    mockGetFleetStatus.mockResolvedValue(true);
    mockVehicleUpsert.mockResolvedValue({ id: 'vehicle-1' });
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

// ─── getCachedVehicles ────────────────────────────────────────────────────────

describe('getCachedVehicles', () => {
  const mockSession = { user: { id: 'user-1' } };

  it('returns vehicles from DB without triggering sync', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockVehicleFindMany.mockResolvedValue([{ id: 'v1', name: 'Car' }]);

    const result = await getCachedVehicles();

    expect(result).toEqual([{ id: 'v1', name: 'Car' }]);
    expect(mockGetTeslaAccessToken).not.toHaveBeenCalled();
    expect(mockVehicleFindFirst).not.toHaveBeenCalled();
  });

  it('returns empty array when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getCachedVehicles();
    expect(result).toEqual([]);
  });
});

// ─── syncVehicles ─────────────────────────────────────────────────────────────

describe('syncVehicles', () => {
  const mockSession = { user: { id: 'user-1' } };

  it('syncs and revalidates when data is stale', async () => {
    mockAuth.mockResolvedValue(mockSession);
    const staleDate = new Date(Date.now() - 60_000);
    mockVehicleFindFirst.mockResolvedValue({ lastUpdated: staleDate });
    mockGetTeslaAccessToken.mockResolvedValue('test-token');
    mockListVehicles.mockResolvedValue([]);
    mockSettingsUpsert.mockResolvedValue({});

    await syncVehicles();

    expect(mockGetTeslaAccessToken).toHaveBeenCalledWith('user-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/');
  });

  it('skips sync when data is fresh', async () => {
    mockAuth.mockResolvedValue(mockSession);
    const freshDate = new Date();
    mockVehicleFindFirst.mockResolvedValue({ lastUpdated: freshDate });

    await syncVehicles();

    expect(mockGetTeslaAccessToken).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('does nothing when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    await syncVehicles();

    expect(mockVehicleFindFirst).not.toHaveBeenCalled();
  });

  it('logs error on failure without throwing', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockVehicleFindFirst.mockRejectedValue(new Error('DB down'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await syncVehicles();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[syncVehicles] Background sync failed'),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });
});
