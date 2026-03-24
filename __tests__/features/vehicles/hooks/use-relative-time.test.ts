import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useRelativeTime } from '@/features/vehicles/hooks/use-relative-time';

describe('useRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Anchor "now" to a known date: 2026-03-24T12:00:00Z
    vi.setSystemTime(new Date('2026-03-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial relative time text', () => {
    const twoMinutesAgo = '2026-03-24T11:58:00Z';
    const { result } = renderHook(() => useRelativeTime(twoMinutesAgo));

    expect(result.current.text).toBe('2m ago');
  });

  it('returns isFresh=true for timestamps within 5 minutes', () => {
    const oneMinuteAgo = '2026-03-24T11:59:00Z';
    const { result } = renderHook(() => useRelativeTime(oneMinuteAgo));

    expect(result.current.isFresh).toBe(true);
  });

  it('returns isFresh=false for timestamps older than 5 minutes', () => {
    const tenMinutesAgo = '2026-03-24T11:50:00Z';
    const { result } = renderHook(() => useRelativeTime(tenMinutesAgo));

    expect(result.current.isFresh).toBe(false);
  });

  it('returns isFresh=true at exactly 4m59s ago (within threshold)', () => {
    // 4 minutes 59 seconds ago = 299 seconds = 299000 ms, which is < 300000ms
    const justUnderFiveMin = '2026-03-24T11:55:01Z';
    const { result } = renderHook(() => useRelativeTime(justUnderFiveMin));

    expect(result.current.isFresh).toBe(true);
  });

  it('returns isFresh=false at exactly 5 minutes ago', () => {
    const exactlyFiveMin = '2026-03-24T11:55:00Z';
    const { result } = renderHook(() => useRelativeTime(exactlyFiveMin));

    // 300000ms is NOT < 300000ms, so isFresh should be false
    expect(result.current.isFresh).toBe(false);
  });

  it('returns isFresh=false for invalid timestamps', () => {
    const { result } = renderHook(() => useRelativeTime('invalid'));

    expect(result.current.text).toBe('Unknown');
    expect(result.current.isFresh).toBe(false);
  });

  it('updates text after the 30-second interval', () => {
    const twoMinutesAgo = '2026-03-24T11:58:00Z';
    const { result } = renderHook(() => useRelativeTime(twoMinutesAgo));

    expect(result.current.text).toBe('2m ago');

    // Advance 30 seconds — now it's 2m30s ago, still shows "2m ago"
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current.text).toBe('2m ago');

    // Advance another 30 seconds — now it's 3m ago
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current.text).toBe('3m ago');
  });

  it('updates isFresh when crossing the 5-minute threshold', () => {
    // 4 minutes ago — fresh
    const fourMinutesAgo = '2026-03-24T11:56:00Z';
    const { result } = renderHook(() => useRelativeTime(fourMinutesAgo));

    expect(result.current.isFresh).toBe(true);

    // Advance 1 minute (two 30-second intervals) — now 5 minutes ago, stale
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current.isFresh).toBe(false);
  });

  it('cleans up the interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() =>
      useRelativeTime('2026-03-24T11:58:00Z'),
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('resets interval when isoString prop changes', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { rerender } = renderHook(
      ({ iso }: { iso: string }) => useRelativeTime(iso),
      { initialProps: { iso: '2026-03-24T11:58:00Z' } },
    );

    const callCountBeforeRerender = clearIntervalSpy.mock.calls.length;

    rerender({ iso: '2026-03-24T11:50:00Z' });

    // The effect cleanup should have called clearInterval
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(callCountBeforeRerender);
    clearIntervalSpy.mockRestore();
  });

  it('recalculates text immediately when isoString changes', () => {
    const { result, rerender } = renderHook(
      ({ iso }: { iso: string }) => useRelativeTime(iso),
      { initialProps: { iso: '2026-03-24T11:58:00Z' } },
    );

    expect(result.current.text).toBe('2m ago');

    rerender({ iso: '2026-03-24T11:00:00Z' });

    expect(result.current.text).toBe('1h ago');
  });
});
