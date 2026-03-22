import { describe, it, expect } from 'vitest';
import {
  getSpeedBasedZoom,
  interpolateZoom,
  shortestRotation,
  haversineMeters,
  cycleMapMode,
  getCameraParams,
  type MapMode,
} from '@/lib/map-math';

describe('getSpeedBasedZoom', () => {
  it.each([
    [0, 18],
    [5, 18],
    [10, 17],
    [15, 17],
    [20, 16.5],
    [25, 16.5],
    [30, 16],
    [35, 16],
    [40, 15.5],
    [45, 15.5],
    [50, 15],
    [55, 15],
    [60, 14.5],
    [65, 14.5],
    [80, 14],
    [120, 14],
  ])('returns %f zoom for %f mph', (speed, expectedZoom) => {
    expect(getSpeedBasedZoom(speed)).toBe(expectedZoom);
  });

  it('zooms out as speed increases', () => {
    const slow = getSpeedBasedZoom(5);
    const fast = getSpeedBasedZoom(70);
    expect(slow).toBeGreaterThan(fast);
  });
});

describe('interpolateZoom', () => {
  it('moves current toward target by the given factor', () => {
    expect(interpolateZoom(10, 15, 0.2)).toBe(11);
  });

  it('uses default factor of 0.15', () => {
    expect(interpolateZoom(10, 20)).toBeCloseTo(11.5);
  });

  it('returns current when current equals target', () => {
    expect(interpolateZoom(14, 14)).toBe(14);
  });

  it('works when target is lower than current', () => {
    const result = interpolateZoom(18, 14, 0.25);
    expect(result).toBe(17);
  });
});

describe('shortestRotation', () => {
  it('returns target when no wrapping needed', () => {
    expect(shortestRotation(10, 20)).toBe(20);
  });

  it('takes the short path from 350 to 10 (clockwise)', () => {
    const result = shortestRotation(350, 10);
    // Should go 350 -> 370 (= 10 mod 360), not 350 -> 10 (backwards 340 degrees)
    expect(result).toBe(370);
  });

  it('takes the short path from 10 to 350 (counter-clockwise)', () => {
    const result = shortestRotation(10, 350);
    // Should go 10 -> -10 (= 350 mod 360), not 10 -> 350 (forward 340 degrees)
    expect(result).toBe(-10);
  });

  it('handles same bearing', () => {
    expect(shortestRotation(180, 180)).toBe(180);
  });

  it('handles 180 degree difference (either direction is valid)', () => {
    const result = shortestRotation(0, 180);
    expect(Math.abs(result)).toBe(180);
  });

  it('handles negative bearings', () => {
    const result = shortestRotation(-10, 10);
    expect(result).toBe(10);
  });
});

describe('haversineMeters', () => {
  it('returns 0 for same point', () => {
    expect(haversineMeters([-97.74, 30.27], [-97.74, 30.27])).toBe(0);
  });

  it('computes distance between two Austin points', () => {
    // ~1.6km apart: UT Austin to Texas Capitol
    const ut: [number, number] = [-97.7323, 30.2849];
    const capitol: [number, number] = [-97.7404, 30.2747];
    const distance = haversineMeters(ut, capitol);
    expect(distance).toBeGreaterThan(1200);
    expect(distance).toBeLessThan(1600);
  });

  it('computes distance for points at equator', () => {
    // 1 degree of longitude at equator is ~111km
    const a: [number, number] = [0, 0];
    const b: [number, number] = [1, 0];
    const distance = haversineMeters(a, b);
    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_000);
  });

  it('is symmetric', () => {
    const a: [number, number] = [-97.74, 30.27];
    const b: [number, number] = [-97.75, 30.28];
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a));
  });
});

describe('cycleMapMode', () => {
  it('returns current mode when disabled', () => {
    expect(cycleMapMode('north-up', false, true)).toBe('north-up');
    expect(cycleMapMode('heading-up', true, true)).toBe('heading-up');
  });

  it('cycles north-up -> heading-up', () => {
    expect(cycleMapMode('north-up', false, false)).toBe('heading-up');
  });

  it('cycles heading-up -> north-up when no active route', () => {
    expect(cycleMapMode('heading-up', false, false)).toBe('north-up');
  });

  it('cycles heading-up -> route-overview when route is active', () => {
    expect(cycleMapMode('heading-up', true, false)).toBe('route-overview');
  });

  it('cycles route-overview -> north-up', () => {
    expect(cycleMapMode('route-overview', true, false)).toBe('north-up');
  });

  it('full cycle with route: north-up -> heading-up -> route-overview -> north-up', () => {
    let mode: MapMode = 'north-up';
    mode = cycleMapMode(mode, true, false);
    expect(mode).toBe('heading-up');
    mode = cycleMapMode(mode, true, false);
    expect(mode).toBe('route-overview');
    mode = cycleMapMode(mode, true, false);
    expect(mode).toBe('north-up');
  });

  it('full cycle without route: north-up -> heading-up -> north-up', () => {
    let mode: MapMode = 'north-up';
    mode = cycleMapMode(mode, false, false);
    expect(mode).toBe('heading-up');
    mode = cycleMapMode(mode, false, false);
    expect(mode).toBe('north-up');
  });
});

describe('getCameraParams', () => {
  const baseOpts = {
    position: [-97.74, 30.27] as [number, number],
    heading: 45,
    speedMph: 30,
    currentBearing: 0,
    containerHeight: 800,
  };

  it('returns north-up params with bearing 0, pitch 0, no offset', () => {
    const cam = getCameraParams('north-up', baseOpts);
    expect(cam.bearing).toBe(0);
    expect(cam.pitch).toBe(0);
    expect(cam.center).toEqual(baseOpts.position);
    expect(cam.offset).toBeUndefined();
  });

  it('returns heading-up params with rotated bearing, pitch 50, offset', () => {
    const cam = getCameraParams('heading-up', baseOpts);
    expect(cam.pitch).toBe(50);
    expect(cam.offset).toBeDefined();
    expect(cam.offset![1]).toBeCloseTo(800 * 0.15);
    // bearing should be shortestRotation(0, -45) = -45
    expect(cam.bearing).toBe(-45);
  });

  it('uses shortestRotation for heading-up bearing', () => {
    const cam = getCameraParams('heading-up', {
      ...baseOpts,
      currentBearing: 350,
      heading: 10,
    });
    // shortestRotation(350, -10) — should take short path
    // diff = ((-10 - 350 + 540) % 360) - 180 = (180 % 360) - 180 = 0
    // result = 350 + 0 = 350... Let me compute:
    // to = -10, from = 350
    // diff = ((-10 - 350 + 540) % 360) - 180 = (180 % 360) - 180 = 0
    // That gives 350. Actually let me verify: shortestRotation(350, -10)
    // We want to go from 350 to -10 (= 350 degrees), shortest is 0 steps? No.
    // -10 mod 360 = 350, so from=350 to=350 effectively, result=350.
    expect(cam.bearing).toBe(350);
  });

  it('computes zoom from speedMph', () => {
    const cam = getCameraParams('north-up', { ...baseOpts, speedMph: 60 });
    expect(cam.zoom).toBe(14.5);
  });

  it('route-overview falls back to north-up camera params', () => {
    const cam = getCameraParams('route-overview', baseOpts);
    expect(cam.bearing).toBe(0);
    expect(cam.pitch).toBe(0);
  });
});
