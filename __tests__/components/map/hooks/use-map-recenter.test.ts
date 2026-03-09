import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useMapRecenter } from '@/components/map/hooks/use-map-recenter';

// ─── Mock map ────────────────────────────────────────────────────────────────

type MoveEndHandler = () => void;

function createMockMap(center: { lng: number; lat: number }) {
  const listeners = new Map<string, Set<MoveEndHandler>>();
  return {
    getCenter: vi.fn(() => center),
    flyTo: vi.fn(),
    on: vi.fn((event: string, handler: MoveEndHandler) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler: MoveEndHandler) => {
      listeners.get(event)?.delete(handler);
    }),
    _fire(event: string) {
      listeners.get(event)?.forEach((h) => h());
    },
    _setCenter(c: { lng: number; lat: number }) {
      center = c;
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useMapRecenter', () => {
  const vehicleCenter: [number, number] = [-97.74, 30.27];
  let mockMap: ReturnType<typeof createMockMap>;
  let mapRef: React.RefObject<typeof mockMap | null>;

  beforeEach(() => {
    mockMap = createMockMap({ lng: vehicleCenter[0], lat: vehicleCenter[1] });
    mapRef = { current: mockMap } as unknown as React.RefObject<typeof mockMap | null>;
  });

  it('starts as not off-center when map center matches vehicle', () => {
    const { result } = renderHook(() =>
      useMapRecenter(mapRef as never, true, vehicleCenter),
    );

    expect(result.current.isOffCenter).toBe(false);
  });

  it('detects off-center when map is panned away', () => {
    const { result } = renderHook(() =>
      useMapRecenter(mapRef as never, true, vehicleCenter),
    );

    // Simulate user panning the map far away
    mockMap._setCenter({ lng: -97.80, lat: 30.30 });
    act(() => mockMap._fire('moveend'));

    expect(result.current.isOffCenter).toBe(true);
  });

  it('returns to centered after recenter is called', () => {
    const { result } = renderHook(() =>
      useMapRecenter(mapRef as never, true, vehicleCenter),
    );

    // Pan away
    mockMap._setCenter({ lng: -97.80, lat: 30.30 });
    act(() => mockMap._fire('moveend'));
    expect(result.current.isOffCenter).toBe(true);

    // Recenter
    act(() => result.current.recenter());
    expect(mockMap.flyTo).toHaveBeenCalledWith({
      center: vehicleCenter,
      duration: 1000,
    });

    // Simulate flyTo completing
    mockMap._setCenter({ lng: vehicleCenter[0], lat: vehicleCenter[1] });
    act(() => mockMap._fire('moveend'));

    expect(result.current.isOffCenter).toBe(false);
  });

  it('detects off-center when vehicle position changes', () => {
    // Map starts centered on old vehicle position
    const oldCenter: [number, number] = [-97.74, 30.27];
    const newCenter: [number, number] = [-97.80, 30.35];

    const { result, rerender } = renderHook(
      ({ center }) => useMapRecenter(mapRef as never, true, center),
      { initialProps: { center: oldCenter } },
    );

    expect(result.current.isOffCenter).toBe(false);

    // Vehicle switches — new position is far from map center
    rerender({ center: newCenter });

    expect(result.current.isOffCenter).toBe(true);
  });

  it('does nothing when map is not loaded', () => {
    const { result } = renderHook(() =>
      useMapRecenter(mapRef as never, false, vehicleCenter),
    );

    expect(result.current.isOffCenter).toBe(false);
    expect(mockMap.on).not.toHaveBeenCalled();
  });
});
