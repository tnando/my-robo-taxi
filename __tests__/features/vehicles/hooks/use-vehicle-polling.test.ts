import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useVehiclePolling } from '@/features/vehicles/hooks/use-vehicle-polling';
import type { Vehicle } from '@/types/vehicle';

/** Short intervals for fast tests. */
const TEST_OPTIONS = { intervalMs: 50, maxDurationMs: 200 };

function createMockVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    name: 'Test Car',
    model: 'Model 3',
    year: 2024,
    color: 'white',
    licensePlate: 'ABC123',
    chargeLevel: 80,
    estimatedRange: 250,
    status: 'parked',
    speed: 0,
    heading: 0,
    locationName: 'Home',
    locationAddress: '123 Main St',
    latitude: 30.267,
    longitude: -97.743,
    interiorTemp: 72,
    exteriorTemp: 85,
    lastUpdated: new Date().toISOString(),
    odometerMiles: 10000,
    fsdMilesToday: 0,
    virtualKeyPaired: true,
    ...overrides,
  };
}

describe('useVehiclePolling', () => {
  it('calls fetchVehicles immediately when enabled', async () => {
    const fetchVehicles = vi.fn().mockResolvedValue([]);

    renderHook(() => useVehiclePolling(fetchVehicles, true, TEST_OPTIONS));

    await waitFor(() => {
      expect(fetchVehicles).toHaveBeenCalledTimes(1);
    });
  });

  it('does not poll when disabled', () => {
    const fetchVehicles = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() =>
      useVehiclePolling(fetchVehicles, false, TEST_OPTIONS),
    );

    expect(fetchVehicles).not.toHaveBeenCalled();
    expect(result.current.isPolling).toBe(false);
    expect(result.current.timedOut).toBe(false);
  });

  it('stops polling when vehicles are found', async () => {
    const mockVehicle = createMockVehicle();
    const fetchVehicles = vi
      .fn()
      .mockResolvedValueOnce([]) // first: empty
      .mockResolvedValueOnce([mockVehicle]); // second: found

    const { result } = renderHook(() =>
      useVehiclePolling(fetchVehicles, true, TEST_OPTIONS),
    );

    await waitFor(() => {
      expect(result.current.vehicles).toHaveLength(1);
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.timedOut).toBe(false);
  });

  it('times out when no vehicles appear', async () => {
    const fetchVehicles = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() =>
      useVehiclePolling(fetchVehicles, true, TEST_OPTIONS),
    );

    await waitFor(
      () => {
        expect(result.current.timedOut).toBe(true);
      },
      { timeout: 1000 },
    );

    expect(result.current.isPolling).toBe(false);
    expect(result.current.vehicles).toHaveLength(0);
  });

  it('cleans up on unmount (no additional calls)', async () => {
    const fetchVehicles = vi.fn().mockResolvedValue([]);

    const { unmount } = renderHook(() =>
      useVehiclePolling(fetchVehicles, true, TEST_OPTIONS),
    );

    await waitFor(() => {
      expect(fetchVehicles).toHaveBeenCalledTimes(1);
    });

    const callCount = fetchVehicles.mock.calls.length;
    unmount();

    // Wait longer than the poll interval to verify no more calls
    await new Promise((r) => setTimeout(r, 150));
    expect(fetchVehicles).toHaveBeenCalledTimes(callCount);
  });

  it('continues polling on fetch errors', async () => {
    const mockVehicle = createMockVehicle();
    const fetchVehicles = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([mockVehicle]);

    const { result } = renderHook(() =>
      useVehiclePolling(fetchVehicles, true, TEST_OPTIONS),
    );

    await waitFor(() => {
      expect(result.current.vehicles).toHaveLength(1);
    });

    expect(result.current.isPolling).toBe(false);
  });
});
