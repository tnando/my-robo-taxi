import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDriveCreate = vi.fn();
const mockDriveFindFirst = vi.fn();
const mockDriveFindUnique = vi.fn();
const mockDriveUpdate = vi.fn();
const mockDriveDelete = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    drive: {
      create: (...args: unknown[]) => mockDriveCreate(...args),
      findFirst: (...args: unknown[]) => mockDriveFindFirst(...args),
      findUnique: (...args: unknown[]) => mockDriveFindUnique(...args),
      update: (...args: unknown[]) => mockDriveUpdate(...args),
      delete: (...args: unknown[]) => mockDriveDelete(...args),
    },
  },
}));

import { detectAndRecordDrive } from '@/lib/drive-detection';
import type { DriveDetectionInput } from '@/lib/drive-detection';
import {
  haversineDistanceMiles,
  totalDistanceFromRoutePoints,
} from '@/lib/geo';
import type { RoutePoint } from '@/lib/geo';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

// ─── haversineDistanceMiles ──────────────────────────────────────────────────

describe('haversineDistanceMiles', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceMiles(30.0, -97.0, 30.0, -97.0)).toBe(0);
  });

  it('calculates distance between Austin and Dallas (~195 miles)', () => {
    // Austin (30.267, -97.743) to Dallas (32.777, -96.797)
    const distance = haversineDistanceMiles(30.267, -97.743, 32.777, -96.797);
    expect(distance).toBeGreaterThan(180);
    expect(distance).toBeLessThan(210);
  });

  it('calculates short distance accurately', () => {
    // ~1 mile apart
    const distance = haversineDistanceMiles(30.0, -97.0, 30.0145, -97.0);
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.1);
  });
});

// ─── totalDistanceFromRoutePoints ────────────────────────────────────────────

describe('totalDistanceFromRoutePoints', () => {
  it('returns 0 for empty array', () => {
    expect(totalDistanceFromRoutePoints([])).toBe(0);
  });

  it('returns 0 for single point', () => {
    const points: RoutePoint[] = [
      { lat: 30.0, lng: -97.0, timestamp: '2026-01-01T00:00:00Z', speed: 30 },
    ];
    expect(totalDistanceFromRoutePoints(points)).toBe(0);
  });

  it('sums distances between consecutive points', () => {
    const points: RoutePoint[] = [
      { lat: 30.0, lng: -97.0, timestamp: '2026-01-01T00:00:00Z', speed: 30 },
      { lat: 30.0145, lng: -97.0, timestamp: '2026-01-01T00:01:00Z', speed: 30 },
      { lat: 30.029, lng: -97.0, timestamp: '2026-01-01T00:02:00Z', speed: 30 },
    ];
    const distance = totalDistanceFromRoutePoints(points);
    // ~2 miles total (two ~1-mile segments)
    expect(distance).toBeGreaterThan(1.8);
    expect(distance).toBeLessThan(2.2);
  });
});

// ─── detectAndRecordDrive ────────────────────────────────────────────────────

describe('detectAndRecordDrive', () => {
  const baseDrivingInput: DriveDetectionInput = {
    vehicleId: 'vehicle-1',
    status: 'driving',
    latitude: 30.325,
    longitude: -97.738,
    speed: 45,
    chargeLevel: 80,
    odometerMiles: 12000,
  };

  const baseParkedInput: DriveDetectionInput = {
    vehicleId: 'vehicle-1',
    status: 'parked',
    latitude: 30.400,
    longitude: -97.700,
    speed: 0,
    chargeLevel: 75,
    odometerMiles: 12010,
  };

  describe('starting a drive', () => {
    it('creates a new drive when vehicle transitions to driving with no active drive', async () => {
      mockDriveFindFirst.mockResolvedValue(null); // No active drive
      mockDriveCreate.mockResolvedValue({ id: 'drive-1' });

      await detectAndRecordDrive(baseDrivingInput);

      expect(mockDriveCreate).toHaveBeenCalledTimes(1);
      const createArg = mockDriveCreate.mock.calls[0][0];
      expect(createArg.data.vehicleId).toBe('vehicle-1');
      expect(createArg.data.startLocation).toBe('30.325,-97.738');
      expect(createArg.data.startChargeLevel).toBe(80);
      expect(createArg.data.maxSpeedMph).toBe(45);
      expect(createArg.data.endTime).toBe(''); // In-progress marker
      expect(createArg.data.fsdMiles).toBe(0);
      expect(createArg.data.fsdPercentage).toBe(0);
      expect(createArg.data.interventions).toBe(0);
      // Route points should contain the initial point
      expect(createArg.data.routePoints).toHaveLength(1);
      expect(createArg.data.routePoints[0].lat).toBe(30.325);
      expect(createArg.data.routePoints[0].lng).toBe(-97.738);
      expect(createArg.data.routePoints[0].speed).toBe(45);
    });

    it('does not create a drive when vehicle is driving at 0,0 (invalid coords)', async () => {
      mockDriveFindFirst.mockResolvedValue(null);

      await detectAndRecordDrive({
        ...baseDrivingInput,
        latitude: 0,
        longitude: 0,
      });

      expect(mockDriveCreate).not.toHaveBeenCalled();
    });
  });

  describe('updating an active drive', () => {
    it('appends route point and updates max speed', async () => {
      const activeDrive = {
        id: 'drive-1',
        vehicleId: 'vehicle-1',
        endTime: '',
      };
      mockDriveFindFirst.mockResolvedValue(activeDrive);
      mockDriveFindUnique.mockResolvedValue({
        routePoints: [
          { lat: 30.300, lng: -97.750, timestamp: '2026-01-01T12:00:00Z', speed: 30 },
        ],
        maxSpeedMph: 30,
      });
      mockDriveUpdate.mockResolvedValue({});

      await detectAndRecordDrive({
        ...baseDrivingInput,
        speed: 65,
      });

      expect(mockDriveUpdate).toHaveBeenCalledTimes(1);
      const updateArg = mockDriveUpdate.mock.calls[0][0];
      expect(updateArg.where.id).toBe('drive-1');
      expect(updateArg.data.routePoints).toHaveLength(2);
      expect(updateArg.data.routePoints[1].lat).toBe(30.325);
      expect(updateArg.data.maxSpeedMph).toBe(65);
    });

    it('keeps existing max speed if current speed is lower', async () => {
      const activeDrive = {
        id: 'drive-1',
        vehicleId: 'vehicle-1',
        endTime: '',
      };
      mockDriveFindFirst.mockResolvedValue(activeDrive);
      mockDriveFindUnique.mockResolvedValue({
        routePoints: [
          { lat: 30.300, lng: -97.750, timestamp: '2026-01-01T12:00:00Z', speed: 70 },
        ],
        maxSpeedMph: 70,
      });
      mockDriveUpdate.mockResolvedValue({});

      await detectAndRecordDrive({
        ...baseDrivingInput,
        speed: 45,
      });

      const updateArg = mockDriveUpdate.mock.calls[0][0];
      expect(updateArg.data.maxSpeedMph).toBe(70);
    });
  });

  describe('ending a drive', () => {
    it('completes the drive with computed stats', async () => {
      const startTime = new Date(Date.now() - 30 * 60_000); // 30 min ago
      const activeDrive = {
        id: 'drive-1',
        vehicleId: 'vehicle-1',
        startTime: startTime.toISOString(),
        endTime: '',
        startLocation: '30.300,-97.750',
        startChargeLevel: 85,
        maxSpeedMph: 65,
        routePoints: [
          { lat: 30.300, lng: -97.750, timestamp: startTime.toISOString(), speed: 45 },
          { lat: 30.350, lng: -97.720, timestamp: new Date(Date.now() - 15 * 60_000).toISOString(), speed: 65 },
        ],
      };
      mockDriveFindFirst.mockResolvedValue(activeDrive);
      mockDriveFindUnique.mockResolvedValue(activeDrive);
      mockDriveUpdate.mockResolvedValue({});

      await detectAndRecordDrive(baseParkedInput);

      expect(mockDriveUpdate).toHaveBeenCalledTimes(1);
      const updateArg = mockDriveUpdate.mock.calls[0][0];
      expect(updateArg.where.id).toBe('drive-1');
      expect(updateArg.data.endTime).toBeTruthy();
      expect(updateArg.data.endTime).not.toBe('');
      expect(updateArg.data.endLocation).toBe('30.4,-97.7');
      expect(updateArg.data.endChargeLevel).toBe(75);
      expect(updateArg.data.durationMinutes).toBeGreaterThanOrEqual(29);
      expect(updateArg.data.durationMinutes).toBeLessThanOrEqual(31);
      expect(updateArg.data.distanceMiles).toBeGreaterThan(0);
      expect(updateArg.data.avgSpeedMph).toBeGreaterThan(0);
      // Energy estimate: (85 - 75) * 0.75 = 7.5 kWh
      expect(updateArg.data.energyUsedKwh).toBe(7.5);
      // Route points should include the final stop point
      expect(updateArg.data.routePoints.length).toBeGreaterThan(2);
    });

    it('deletes micro-drives under 2 minutes and 0.1 miles', async () => {
      const startTime = new Date(Date.now() - 30_000); // 30 seconds ago
      const activeDrive = {
        id: 'drive-micro',
        vehicleId: 'vehicle-1',
        startTime: startTime.toISOString(),
        endTime: '',
        startLocation: '30.325,-97.738',
        startChargeLevel: 80,
        maxSpeedMph: 5,
        routePoints: [
          { lat: 30.325, lng: -97.738, timestamp: startTime.toISOString(), speed: 5 },
        ],
      };
      mockDriveFindFirst.mockResolvedValue(activeDrive);
      mockDriveFindUnique.mockResolvedValue(activeDrive);
      mockDriveDelete.mockResolvedValue({});

      await detectAndRecordDrive({
        ...baseParkedInput,
        latitude: 30.3251,
        longitude: -97.7381,
      });

      expect(mockDriveDelete).toHaveBeenCalledWith({ where: { id: 'drive-micro' } });
      expect(mockDriveUpdate).not.toHaveBeenCalled();
    });
  });

  describe('no-op scenarios', () => {
    it('does nothing when parked with no active drive', async () => {
      mockDriveFindFirst.mockResolvedValue(null);

      await detectAndRecordDrive(baseParkedInput);

      expect(mockDriveCreate).not.toHaveBeenCalled();
      expect(mockDriveUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when charging with no active drive', async () => {
      mockDriveFindFirst.mockResolvedValue(null);

      await detectAndRecordDrive({
        ...baseParkedInput,
        status: 'charging',
      });

      expect(mockDriveCreate).not.toHaveBeenCalled();
      expect(mockDriveUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when offline with no active drive', async () => {
      mockDriveFindFirst.mockResolvedValue(null);

      await detectAndRecordDrive({
        ...baseParkedInput,
        status: 'offline',
      });

      expect(mockDriveCreate).not.toHaveBeenCalled();
      expect(mockDriveUpdate).not.toHaveBeenCalled();
    });
  });

  describe('race condition edge cases', () => {
    it('handles updateActiveDrive when drive is deleted between queries', async () => {
      mockDriveFindFirst.mockResolvedValue({ id: 'drive-gone', endTime: '' });
      // Drive deleted between findFirst and findUnique (race condition)
      mockDriveFindUnique.mockResolvedValue(null);

      await detectAndRecordDrive(baseDrivingInput);

      expect(mockDriveUpdate).not.toHaveBeenCalled();
    });

    it('handles endDrive when drive is deleted between queries', async () => {
      mockDriveFindFirst.mockResolvedValue({ id: 'drive-gone', endTime: '' });
      // Drive deleted between findFirst and findUnique (race condition)
      mockDriveFindUnique.mockResolvedValue(null);

      await detectAndRecordDrive(baseParkedInput);

      expect(mockDriveUpdate).not.toHaveBeenCalled();
      expect(mockDriveDelete).not.toHaveBeenCalled();
    });
  });

  describe('in_service status', () => {
    it('ends an active drive when vehicle enters in_service', async () => {
      const startTime = new Date(Date.now() - 30 * 60_000);
      const activeDrive = {
        id: 'drive-service',
        vehicleId: 'vehicle-1',
        startTime: startTime.toISOString(),
        endTime: '',
        startLocation: '30.300,-97.750',
        startChargeLevel: 85,
        maxSpeedMph: 60,
        routePoints: [
          { lat: 30.300, lng: -97.750, timestamp: startTime.toISOString(), speed: 60 },
        ],
      };
      mockDriveFindFirst.mockResolvedValue(activeDrive);
      mockDriveFindUnique.mockResolvedValue(activeDrive);
      mockDriveUpdate.mockResolvedValue({});

      await detectAndRecordDrive({
        ...baseParkedInput,
        status: 'in_service',
      });

      expect(mockDriveUpdate).toHaveBeenCalledTimes(1);
      const updateArg = mockDriveUpdate.mock.calls[0][0];
      expect(updateArg.data.endTime).toBeTruthy();
      expect(updateArg.data.endTime).not.toBe('');
    });
  });

  describe('ending a drive with 0,0 coordinates', () => {
    it('uses startLocation as endLocation when ending at 0,0', async () => {
      const startTime = new Date(Date.now() - 30 * 60_000);
      const activeDrive = {
        id: 'drive-offline',
        vehicleId: 'vehicle-1',
        startTime: startTime.toISOString(),
        endTime: '',
        startLocation: '30.300,-97.750',
        startChargeLevel: 85,
        maxSpeedMph: 55,
        routePoints: [
          { lat: 30.300, lng: -97.750, timestamp: startTime.toISOString(), speed: 55 },
          { lat: 30.350, lng: -97.720, timestamp: new Date(Date.now() - 15 * 60_000).toISOString(), speed: 55 },
        ],
      };
      mockDriveFindFirst.mockResolvedValue(activeDrive);
      mockDriveFindUnique.mockResolvedValue(activeDrive);
      mockDriveUpdate.mockResolvedValue({});

      await detectAndRecordDrive({
        ...baseParkedInput,
        status: 'offline',
        latitude: 0,
        longitude: 0,
      });

      expect(mockDriveUpdate).toHaveBeenCalledTimes(1);
      const updateArg = mockDriveUpdate.mock.calls[0][0];
      // Should fall back to startLocation since coords are 0,0
      expect(updateArg.data.endLocation).toBe('30.300,-97.750');
      // Should NOT have appended a 0,0 route point
      expect(updateArg.data.routePoints).toHaveLength(2);
    });
  });
});
