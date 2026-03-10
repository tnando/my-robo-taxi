import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { usePullToRefresh } from '@/features/vehicles/hooks/use-pull-to-refresh';

// Helper to dispatch touch events on document
function touch(type: string, clientY: number) {
  const event = new TouchEvent(type, {
    touches: type === 'touchend' ? [] : [{ clientY } as Touch],
    bubbles: true,
  });
  document.dispatchEvent(event);
}

describe('usePullToRefresh', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not trigger refresh for small pulls', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    // Set viewport height
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    renderHook(() => usePullToRefresh(onRefresh));

    act(() => {
      touch('touchstart', 100); // top 40% of 800 = 320
      touch('touchmove', 130);  // 30px pull — below threshold
      touch('touchend', 130);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('triggers refresh when pull exceeds threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    renderHook(() => usePullToRefresh(onRefresh));

    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 200); // 100px pull — above 80px threshold
    });

    await act(async () => {
      touch('touchend', 200);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('ignores touches that start below the top 40% of viewport', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    renderHook(() => usePullToRefresh(onRefresh));

    act(() => {
      touch('touchstart', 500); // 500 > 320 (40% of 800)
      touch('touchmove', 600);
      touch('touchend', 600);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('returns pullDistance while pulling', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    expect(result.current.pullDistance).toBe(0);

    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 160); // 60px pull
    });

    expect(result.current.pullDistance).toBe(60);

    act(() => {
      touch('touchend', 160);
    });

    // Below threshold — resets to 0
    expect(result.current.pullDistance).toBe(0);
  });

  it('caps pullDistance at max pull value', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 350); // 250px pull — should cap at 120
    });

    expect(result.current.pullDistance).toBe(120);
  });

  it('ignores pull gesture when sheet is dragging', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    renderHook(() => usePullToRefresh(onRefresh, true));

    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 200); // 100px pull — would normally trigger
    });

    await act(async () => {
      touch('touchend', 200);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
