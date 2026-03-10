import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBottomSheet } from '@/features/vehicles/hooks/use-bottom-sheet';
import { SHEET_PEEK_HEIGHT } from '@/lib/constants';

describe('useBottomSheet', () => {
  it('defaults to peek state', () => {
    const { result } = renderHook(() => useBottomSheet());

    expect(result.current.sheetState).toBe('peek');
    expect(result.current.isDragging).toBe(false);
  });

  it('initializes with peek height', () => {
    const { result } = renderHook(() => useBottomSheet());

    expect(result.current.currentHeight).toBe(SHEET_PEEK_HEIGHT);
  });

  it('can be initialized with half state', () => {
    const { result } = renderHook(() => useBottomSheet('half'));

    expect(result.current.sheetState).toBe('half');
  });

  it('can be initialized with full state', () => {
    const { result } = renderHook(() => useBottomSheet('full'));

    expect(result.current.sheetState).toBe('full');
  });

  it('returns touch event handlers', () => {
    const { result } = renderHook(() => useBottomSheet());

    expect(typeof result.current.onTouchStart).toBe('function');
    expect(typeof result.current.onTouchMove).toBe('function');
    expect(typeof result.current.onTouchEnd).toBe('function');
  });

  it('returns stable handler references across renders', () => {
    const { result, rerender } = renderHook(() => useBottomSheet());

    const firstStart = result.current.onTouchStart;
    const firstMove = result.current.onTouchMove;

    rerender();

    // Same state = same callbacks (useCallback)
    expect(result.current.onTouchStart).toBe(firstStart);
    expect(result.current.onTouchMove).toBe(firstMove);
  });

  it('toggles peek → half → full → peek', () => {
    const { result } = renderHook(() => useBottomSheet('peek'));
    expect(result.current.sheetState).toBe('peek');

    act(() => { result.current.toggle(); });
    expect(result.current.sheetState).toBe('half');

    act(() => { result.current.toggle(); });
    expect(result.current.sheetState).toBe('full');

    act(() => { result.current.toggle(); });
    expect(result.current.sheetState).toBe('peek');
    expect(result.current.currentHeight).toBe(SHEET_PEEK_HEIGHT);
  });

  it('clamps drag height between floor and full height', () => {
    const { result } = renderHook(() => useBottomSheet('peek'));

    // Simulate drag start
    const touchStart = { touches: [{ clientY: 600 }], preventDefault: () => {}, stopPropagation: () => {} } as unknown as React.TouchEvent;
    act(() => { result.current.onTouchStart(touchStart); });
    expect(result.current.isDragging).toBe(true);

    // Drag far up — should clamp at full height, not exceed it
    const touchMove = { touches: [{ clientY: 0 }], preventDefault: () => {}, stopPropagation: () => {} } as unknown as React.TouchEvent;
    act(() => { result.current.onTouchMove(touchMove); });

    const fullHeight = Math.round(window.innerHeight * 0.9);
    expect(result.current.currentHeight).toBeLessThanOrEqual(fullHeight);

    // Drag far down — should clamp at floor (120)
    const touchMoveDown = { touches: [{ clientY: 1200 }], preventDefault: () => {}, stopPropagation: () => {} } as unknown as React.TouchEvent;
    act(() => { result.current.onTouchMove(touchMoveDown); });
    expect(result.current.currentHeight).toBe(120);
  });

  it('snaps to nearest state on release', () => {
    const { result } = renderHook(() => useBottomSheet('peek'));

    // Simulate drag to just past the peek/half midpoint
    const touchStart = { touches: [{ clientY: 600 }], preventDefault: () => {}, stopPropagation: () => {} } as unknown as React.TouchEvent;
    act(() => { result.current.onTouchStart(touchStart); });

    // Drag up by enough to pass peek/half midpoint
    const halfHeight = Math.round(window.innerHeight * 0.5);
    const midpoint = (SHEET_PEEK_HEIGHT + halfHeight) / 2;
    const dragDistance = midpoint - SHEET_PEEK_HEIGHT + 20; // past midpoint
    const touchMove = { touches: [{ clientY: 600 - dragDistance }], preventDefault: () => {}, stopPropagation: () => {} } as unknown as React.TouchEvent;
    act(() => { result.current.onTouchMove(touchMove); });

    act(() => { result.current.onTouchEnd(); });
    expect(result.current.sheetState).toBe('half');
    expect(result.current.isDragging).toBe(false);
  });
});
