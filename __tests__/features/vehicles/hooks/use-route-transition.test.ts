import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useRouteTransition } from '@/features/vehicles/hooks/use-route-transition';

describe('useRouteTransition', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts as not transitioning', () => {
    const coords: [number, number][] = [[0, 0], [1, 1]];
    const { result } = renderHook(() => useRouteTransition(coords, 'Home', 10, []));
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('transitions when route fingerprint changes', () => {
    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route1, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    expect(result.current.isRouteTransitioning).toBe(false);

    // Route changes — should start transitioning
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(true);
  });

  it('clears transition when destination name changes (value comparison)', () => {
    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route1, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    // Route changes — transitioning starts
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // Destination value updates — transitioning clears
    rerender({ coords: route2, dest: 'Office', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('clears transition when ETA changes (value comparison)', () => {
    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route1, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    rerender({ coords: route2, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // ETA value updates — transitioning clears
    rerender({ coords: route2, dest: 'Home', eta: 15, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('clears transition when lastUpdateFields includes destinationName', () => {
    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route1, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    // Route changes — transitioning starts
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['navRouteCoordinates'] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // First subsequent render — watchingRef activates (fields skipped)
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['speed'] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // Second subsequent render — destinationName field arrives, clears skeleton
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['destinationName'] });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('clears transition when lastUpdateFields includes etaMinutes', () => {
    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route1, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    // Route changes
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['navRouteCoordinates'] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // First subsequent render — watchingRef activates
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['heading'] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // etaMinutes field arrives — clears skeleton
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['etaMinutes'] });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('does NOT clear transition when lastUpdateFields contains only non-nav fields', () => {
    vi.useFakeTimers();

    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route1, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    // Route changes
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // First subsequent render — watchingRef activates
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['speed'] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // Non-nav fields — should NOT clear
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['speed', 'heading'] });
    expect(result.current.isRouteTransitioning).toBe(true);

    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['latitude', 'longitude'] });
    expect(result.current.isRouteTransitioning).toBe(true);

    vi.useRealTimers();
  });

  it('auto-clears after 10s failsafe timeout', () => {
    vi.useFakeTimers();

    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route1, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    rerender({ coords: route2, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // 2s should NOT clear (old behavior was 2s — that's gone now)
    act(() => { vi.advanceTimersByTime(2100); });
    expect(result.current.isRouteTransitioning).toBe(true);

    // 10s failsafe clears the skeleton
    act(() => { vi.advanceTimersByTime(8000); });
    expect(result.current.isRouteTransitioning).toBe(false);

    vi.useRealTimers();
  });

  it('does not transition when route is undefined', () => {
    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: undefined as [number, number][] | undefined, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    expect(result.current.isRouteTransitioning).toBe(false);

    // Still undefined — no transition
    rerender({ coords: undefined, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('does not transition when coordinates are identical', () => {
    const route: [number, number][] = [[0, 0], [1, 1]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    // Same reference — no change
    rerender({ coords: route, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(false);

    // New array, same fingerprint — no change
    const routeCopy: [number, number][] = [[0, 0], [1, 1]];
    rerender({ coords: routeCopy, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('cancels failsafe timeout when nav field arrives', () => {
    vi.useFakeTimers();

    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta, fields }) => useRouteTransition(coords, dest, eta, fields),
      { initialProps: { coords: route1, dest: 'Home', eta: 10, fields: [] as string[] } },
    );

    // Route changes — start transitioning
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: [] });
    expect(result.current.isRouteTransitioning).toBe(true);

    // First subsequent render — watchingRef activates
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['speed'] });

    // Nav field arrives — clears immediately
    rerender({ coords: route2, dest: 'Home', eta: 10, fields: ['destinationName'] });
    expect(result.current.isRouteTransitioning).toBe(false);

    // Verify failsafe timeout was cancelled — advancing past 10s should not error
    act(() => { vi.advanceTimersByTime(11_000); });
    expect(result.current.isRouteTransitioning).toBe(false);

    vi.useRealTimers();
  });
});
