/**
 * Unit tests for useVehicleStream.
 *
 * Tests focus on the Record-based state shape and the sync/merge logic.
 * WebSocket connection is not exercised here — that requires a live server
 * and is covered by E2E tests.
 *
 * IMPORTANT: The `initialVehicles` array MUST be a stable reference defined
 * outside the renderHook callback. Passing a new literal `[]` on every render
 * would cause the sync useEffect to loop (React identity comparison on arrays).
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { Vehicle } from '@/types/vehicle';
import { useVehicleStream } from '@/features/vehicles/hooks/use-vehicle-stream';

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    name: 'Model S',
    model: 'Model S',
    year: 2023,
    color: 'black',
    licensePlate: 'ABC123',
    chargeLevel: 80,
    estimatedRange: 250,
    status: 'parked',
    speed: 0,
    gearPosition: null,
    heading: 0,
    locationName: 'Home',
    locationAddress: '123 Main St',
    latitude: 30.267,
    longitude: -97.743,
    interiorTemp: 72,
    exteriorTemp: 85,
    lastUpdated: '1m ago',
    odometerMiles: 10000,
    fsdMilesToday: 0,
    virtualKeyPaired: true,
    setupStatus: 'connected',
    ...overrides,
  };
}

// Stable arrays defined at module scope to avoid reference churn
const emptyVehicles: Vehicle[] = [];
const oneVehicle = [makeVehicle({ id: 'v1' })];
const twoVehicles = [
  makeVehicle({ id: 'v1', name: 'Alpha' }),
  makeVehicle({ id: 'v2', name: 'Beta' }),
];
const threeVehicles = [
  makeVehicle({ id: 'a', name: 'Alpha' }),
  makeVehicle({ id: 'b', name: 'Beta' }),
  makeVehicle({ id: 'c', name: 'Gamma' }),
];

describe('useVehicleStream', () => {
  it('returns a plain Record indexed by vehicle id, not a Map', () => {
    const { result } = renderHook(() => useVehicleStream(twoVehicles));

    expect(result.current.vehicles instanceof Map).toBe(false);
    expect(result.current.vehicles).toBeTypeOf('object');
    expect(result.current.vehicles['v1'].name).toBe('Alpha');
    expect(result.current.vehicles['v2'].name).toBe('Beta');
  });

  it('initialises connectionStatus as disconnected when no token is given', () => {
    const { result } = renderHook(() => useVehicleStream(oneVehicle));
    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('returns an empty Record when no initial vehicles are provided', () => {
    const { result } = renderHook(() => useVehicleStream(emptyVehicles));
    expect(Object.keys(result.current.vehicles)).toHaveLength(0);
  });

  it('reflects all initial vehicles in the Record', () => {
    const { result } = renderHook(() => useVehicleStream(threeVehicles));
    expect(Object.keys(result.current.vehicles)).toHaveLength(3);
    expect(result.current.vehicles['a'].name).toBe('Alpha');
    expect(result.current.vehicles['c'].name).toBe('Gamma');
  });

  it('exposes a reconnect function that does not throw when no WS is open', () => {
    const { result } = renderHook(() => useVehicleStream(oneVehicle));
    expect(() => result.current.reconnect()).not.toThrow();
  });

  it('adds a new vehicle when the initial vehicles prop gains an entry', () => {
    // Start with one vehicle, then rerender with two
    const v1Only = [makeVehicle({ id: 'v1', name: 'Alpha' })];
    const v1AndV2 = [
      makeVehicle({ id: 'v1', name: 'Alpha' }),
      makeVehicle({ id: 'v2', name: 'Beta' }),
    ];

    const { result, rerender } = renderHook(
      ({ vehicles }: { vehicles: Vehicle[] }) => useVehicleStream(vehicles),
      { initialProps: { vehicles: v1Only } },
    );
    expect(Object.keys(result.current.vehicles)).toHaveLength(1);

    rerender({ vehicles: v1AndV2 });
    expect(Object.keys(result.current.vehicles)).toHaveLength(2);
    expect(result.current.vehicles['v2'].name).toBe('Beta');
  });
});
