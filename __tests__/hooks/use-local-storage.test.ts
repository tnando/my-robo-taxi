import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/use-local-storage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns the stored value when key exists', () => {
    localStorage.setItem('key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('persists a new value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(localStorage.getItem('key') ?? '')).toBe('updated');
  });

  it('accepts a function updater', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(JSON.parse(localStorage.getItem('count') ?? '')).toBe(1);
  });

  it('handles object values', () => {
    const { result } = renderHook(() => useLocalStorage('obj', { x: 1 }));

    act(() => {
      result.current[1]({ x: 2 });
    });

    expect(result.current[0]).toEqual({ x: 2 });
    expect(JSON.parse(localStorage.getItem('obj') ?? '')).toEqual({ x: 2 });
  });

  it('falls back to initial value when stored JSON is invalid', () => {
    localStorage.setItem('key', 'not-valid-json');
    const { result } = renderHook(() => useLocalStorage('key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('warns on write failure without crashing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('Storage full');
      });

    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    act(() => {
      result.current[1]('updated');
    });

    // State still updates even if localStorage write fails
    expect(result.current[0]).toBe('updated');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write key'),
    );

    setItemSpy.mockRestore();
  });
});
