import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useBackgroundSync } from '@/features/vehicles/hooks/use-background-sync';

describe('useBackgroundSync', () => {
  it('calls onSync on mount', async () => {
    const onSync = vi.fn().mockResolvedValue(undefined);

    renderHook(() => useBackgroundSync(onSync));

    await waitFor(() => {
      expect(onSync).toHaveBeenCalledTimes(1);
    });
  });

  it('returns false after sync completes', async () => {
    const onSync = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useBackgroundSync(onSync));

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('does not call onSync again on re-render', async () => {
    const onSync = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(() => useBackgroundSync(onSync));

    await waitFor(() => {
      expect(onSync).toHaveBeenCalledTimes(1);
    });

    rerender();

    expect(onSync).toHaveBeenCalledTimes(1);
  });
});
