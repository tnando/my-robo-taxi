import { describe, it, expect } from 'vitest';

import {
  normalizeRoutePoints,
  isStoredRoutePoint,
} from '@/features/drives/api/normalize-route-points';

describe('isStoredRoutePoint', () => {
  it('returns true for valid stored route points', () => {
    expect(
      isStoredRoutePoint({
        lat: 37.7749,
        lng: -122.4194,
        timestamp: '2026-03-15T10:00:00Z',
        speed: 55,
      }),
    ).toBe(true);
  });

  it('returns true when extra properties are present', () => {
    expect(
      isStoredRoutePoint({
        lat: 37.7749,
        lng: -122.4194,
        timestamp: '2026-03-15T10:00:00Z',
        speed: 55,
        heading: 180,
      }),
    ).toBe(true);
  });

  it('returns false for null', () => {
    expect(isStoredRoutePoint(null)).toBe(false);
  });

  it('returns false for non-object types', () => {
    expect(isStoredRoutePoint('string')).toBe(false);
    expect(isStoredRoutePoint(42)).toBe(false);
    expect(isStoredRoutePoint(undefined)).toBe(false);
  });

  it('returns false when lat/lng are not numbers', () => {
    expect(
      isStoredRoutePoint({ lat: '37.7749', lng: -122.4194 }),
    ).toBe(false);
    expect(
      isStoredRoutePoint({ lat: 37.7749, lng: '-122.4194' }),
    ).toBe(false);
  });

  it('returns false when lat or lng is missing', () => {
    expect(isStoredRoutePoint({ lat: 37.7749 })).toBe(false);
    expect(isStoredRoutePoint({ lng: -122.4194 })).toBe(false);
  });
});

describe('normalizeRoutePoints', () => {
  it('returns empty array for null input', () => {
    expect(normalizeRoutePoints(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(normalizeRoutePoints(undefined)).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(normalizeRoutePoints('string')).toEqual([]);
    expect(normalizeRoutePoints(42)).toEqual([]);
    expect(normalizeRoutePoints({})).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(normalizeRoutePoints([])).toEqual([]);
  });

  it('converts stored {lat, lng} objects to [lng, lat] tuples', () => {
    const stored = [
      { lat: 37.7749, lng: -122.4194, timestamp: '2026-03-15T10:00:00Z', speed: 55 },
      { lat: 37.7849, lng: -122.4094, timestamp: '2026-03-15T10:05:00Z', speed: 60 },
    ];

    const result = normalizeRoutePoints(stored);

    expect(result).toEqual([
      [-122.4194, 37.7749],
      [-122.4094, 37.7849],
    ]);
  });

  it('preserves correct GeoJSON [lng, lat] ordering from stored objects', () => {
    const stored = [
      { lat: 40.7128, lng: -74.006, timestamp: '2026-03-15T10:00:00Z', speed: 30 },
    ];

    const result = normalizeRoutePoints(stored);

    // GeoJSON convention: [longitude, latitude]
    expect(result[0][0]).toBe(-74.006); // longitude first
    expect(result[0][1]).toBe(40.7128); // latitude second
  });

  it('passes through [lng, lat] tuples unchanged', () => {
    const tuples = [
      [-122.4194, 37.7749],
      [-122.4094, 37.7849],
    ];

    const result = normalizeRoutePoints(tuples);

    expect(result).toEqual(tuples);
  });

  it('handles single-element array of stored object', () => {
    const stored = [
      { lat: 37.7749, lng: -122.4194, timestamp: '2026-03-15T10:00:00Z', speed: 0 },
    ];

    expect(normalizeRoutePoints(stored)).toEqual([[-122.4194, 37.7749]]);
  });

  it('handles single-element array of tuple', () => {
    const tuples = [[-122.4194, 37.7749]];

    expect(normalizeRoutePoints(tuples)).toEqual([[-122.4194, 37.7749]]);
  });

  it('handles mixed input of stored objects and tuples', () => {
    const mixed = [
      { lat: 37.7749, lng: -122.4194, timestamp: '2026-03-15T10:00:00Z', speed: 55 },
      [-74.006, 40.7128],
    ];

    const result = normalizeRoutePoints(mixed);

    expect(result).toEqual([
      [-122.4194, 37.7749],
      [-74.006, 40.7128],
    ]);
  });

  it('filters out invalid elements', () => {
    const input = [
      { lat: 37.7749, lng: -122.4194, timestamp: '2026-03-15T10:00:00Z', speed: 55 },
      'invalid',
      null,
      42,
      [-122.4094, 37.7849],
    ];

    const result = normalizeRoutePoints(input);

    expect(result).toEqual([
      [-122.4194, 37.7749],
      [-122.4094, 37.7849],
    ]);
  });

  it('filters out arrays with wrong length', () => {
    const input = [
      [-122.4194, 37.7749, 100], // 3 elements — too many
      [-122.4194],               // 1 element — too few
      [],                        // empty
      [-122.4094, 37.7849],      // valid
    ];

    const result = normalizeRoutePoints(input);

    expect(result).toEqual([[-122.4094, 37.7849]]);
  });

  it('handles stored objects with zero coordinates', () => {
    const stored = [
      { lat: 0, lng: 0, timestamp: '2026-03-15T10:00:00Z', speed: 0 },
    ];

    expect(normalizeRoutePoints(stored)).toEqual([[0, 0]]);
  });

  it('handles negative coordinates correctly', () => {
    const stored = [
      { lat: -33.8688, lng: 151.2093, timestamp: '2026-03-15T10:00:00Z', speed: 40 },
    ];

    const result = normalizeRoutePoints(stored);

    expect(result).toEqual([[151.2093, -33.8688]]);
  });
});
