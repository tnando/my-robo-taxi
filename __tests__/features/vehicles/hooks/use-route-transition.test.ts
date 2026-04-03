import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useRouteTransition } from '@/features/vehicles/hooks/use-route-transition';

describe('useRouteTransition', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts as not transitioning', () => {
    const coords: [number, number][] = [[0, 0], [1, 1]];
    const { result } = renderHook(() => useRouteTransition(coords, 'Home', 10));
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('transitions when route fingerprint changes', () => {
    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta }) => useRouteTransition(coords, dest, eta),
      { initialProps: { coords: route1, dest: 'Home', eta: 10 } },
    );

    expect(result.current.isRouteTransitioning).toBe(false);

    // Route changes — should start transitioning
    rerender({ coords: route2, dest: 'Home', eta: 10 });
    expect(result.current.isRouteTransitioning).toBe(true);
  });

  it('clears transition when destination name changes', () => {
    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta }) => useRouteTransition(coords, dest, eta),
      { initialProps: { coords: route1, dest: 'Home', eta: 10 } },
    );

    // Route changes — transitioning starts
    rerender({ coords: route2, dest: 'Home', eta: 10 });
    expect(result.current.isRouteTransitioning).toBe(true);

    // Destination updates — transitioning clears
    rerender({ coords: route2, dest: 'Office', eta: 10 });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('clears transition when ETA changes', () => {
    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta }) => useRouteTransition(coords, dest, eta),
      { initialProps: { coords: route1, dest: 'Home', eta: 10 } },
    );

    rerender({ coords: route2, dest: 'Home', eta: 10 });
    expect(result.current.isRouteTransitioning).toBe(true);

    // ETA updates — transitioning clears
    rerender({ coords: route2, dest: 'Home', eta: 15 });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('auto-clears after timeout', () => {
    vi.useFakeTimers();

    const route1: [number, number][] = [[0, 0], [1, 1]];
    const route2: [number, number][] = [[0, 0], [2, 2], [3, 3]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta }) => useRouteTransition(coords, dest, eta),
      { initialProps: { coords: route1, dest: 'Home', eta: 10 } },
    );

    rerender({ coords: route2, dest: 'Home', eta: 10 });
    expect(result.current.isRouteTransitioning).toBe(true);

    // Advance past the 2s timeout
    act(() => { vi.advanceTimersByTime(2100); });
    expect(result.current.isRouteTransitioning).toBe(false);

    vi.useRealTimers();
  });

  it('does not transition when route is undefined', () => {
    const { result, rerender } = renderHook(
      ({ coords, dest, eta }) => useRouteTransition(coords, dest, eta),
      { initialProps: { coords: undefined as [number, number][] | undefined, dest: 'Home', eta: 10 } },
    );

    expect(result.current.isRouteTransitioning).toBe(false);

    // Still undefined — no transition
    rerender({ coords: undefined, dest: 'Home', eta: 10 });
    expect(result.current.isRouteTransitioning).toBe(false);
  });

  it('does not transition when coordinates are identical', () => {
    const route: [number, number][] = [[0, 0], [1, 1]];

    const { result, rerender } = renderHook(
      ({ coords, dest, eta }) => useRouteTransition(coords, dest, eta),
      { initialProps: { coords: route, dest: 'Home', eta: 10 } },
    );

    // Same reference — no change
    rerender({ coords: route, dest: 'Home', eta: 10 });
    expect(result.current.isRouteTransitioning).toBe(false);

    // New array, same fingerprint — no change
    const routeCopy: [number, number][] = [[0, 0], [1, 1]];
    rerender({ coords: routeCopy, dest: 'Home', eta: 10 });
    expect(result.current.isRouteTransitioning).toBe(false);
  });
});
