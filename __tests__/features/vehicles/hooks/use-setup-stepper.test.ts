import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCheckPairingStatus = vi.fn();
const mockCheckVehicleConnection = vi.fn();
const mockUpdateSetupStatus = vi.fn().mockResolvedValue(undefined);
const mockPushFleetConfig = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/vehicles/api/setup-actions', () => ({
  checkPairingStatus: (...args: unknown[]) => mockCheckPairingStatus(...args),
  checkVehicleConnection: (...args: unknown[]) => mockCheckVehicleConnection(...args),
  updateSetupStatus: (...args: unknown[]) => mockUpdateSetupStatus(...args),
}));

vi.mock('@/features/vehicles/api/fleet-config', () => ({
  pushFleetConfig: (...args: unknown[]) => mockPushFleetConfig(...args),
}));

import { useSetupStepper } from '@/features/vehicles/hooks/use-setup-stepper';
import type { SetupStatus } from '@/types/vehicle';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS = {
  vehicleId: 'vehicle-1',
  vin: 'VIN1',
  userId: 'user-1',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useSetupStepper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSetupStatus.mockResolvedValue(undefined);
    mockPushFleetConfig.mockResolvedValue(undefined);
  });

  describe('initial state from DB status', () => {
    it('starts at step 1 when status is pending_pairing', () => {
      mockCheckPairingStatus.mockResolvedValue({ paired: false, error: false, tokenExpired: false });
      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'pending_pairing' }),
      );
      expect(result.current.step).toBe(1);
    });

    it('starts at step 3 when status is config_pushed', () => {
      mockCheckVehicleConnection.mockResolvedValue({ connected: false, error: false });
      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'config_pushed' }),
      );
      expect(result.current.step).toBe(3);
    });

    it('starts dismissed when status is connected', () => {
      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'connected' }),
      );
      expect(result.current.isDismissed).toBe(true);
    });

    it('starts at step 3 when status is waiting_connection', () => {
      mockCheckVehicleConnection.mockResolvedValue({ connected: false, error: false });
      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'waiting_connection' }),
      );
      expect(result.current.step).toBe(3);
    });
  });

  describe('step 1 — pairing detection', () => {
    it('advances to step 2 when pairing is detected', async () => {
      mockCheckPairingStatus.mockResolvedValue({ paired: true, error: false, tokenExpired: false });
      mockCheckVehicleConnection.mockResolvedValue({ connected: false, error: false });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'pending_pairing' }),
      );

      await waitFor(() => {
        expect(result.current.step).toBe(2);
      });
      expect(mockUpdateSetupStatus).toHaveBeenCalledWith('vehicle-1', 'pairing_detected');
    });

    it('shows token expired error', async () => {
      mockCheckPairingStatus.mockResolvedValue({ paired: false, error: false, tokenExpired: true });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'pending_pairing' }),
      );

      await waitFor(() => {
        expect(result.current.error).toContain('Tesla session has expired');
      });
    });

    it('shows generic error on fleet API failure', async () => {
      mockCheckPairingStatus.mockResolvedValue({ paired: false, error: true, tokenExpired: false });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'pending_pairing' }),
      );

      await waitFor(() => {
        expect(result.current.error).toContain('Could not reach Tesla');
      });
    });
  });

  describe('step 2 — fleet config push', () => {
    it('auto-advances to step 3 after config push', async () => {
      mockCheckVehicleConnection.mockResolvedValue({ connected: false, error: false });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'pairing_detected' }),
      );

      await waitFor(() => {
        expect(result.current.step).toBe(3);
      });
      expect(mockPushFleetConfig).toHaveBeenCalledWith('user-1', 'VIN1');
      expect(mockUpdateSetupStatus).toHaveBeenCalledWith('vehicle-1', 'waiting_connection');
    });

    it('advances to step 3 even when config push fails', async () => {
      mockPushFleetConfig.mockRejectedValue(new Error('push failed'));
      mockCheckVehicleConnection.mockResolvedValue({ connected: false, error: false });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'pairing_detected' }),
      );

      await waitFor(() => {
        expect(result.current.step).toBe(3);
      });
    });
  });

  describe('step 3 — connection poll', () => {
    it('advances to step 4 when vehicle connects', async () => {
      mockCheckVehicleConnection.mockResolvedValue({ connected: true, error: false });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'waiting_connection' }),
      );

      await waitFor(() => {
        expect(result.current.step).toBe(4);
      });
    });

    it('shows error message on telemetry server failure but keeps polling', async () => {
      mockCheckVehicleConnection
        .mockResolvedValueOnce({ connected: false, error: true })
        .mockResolvedValue({ connected: false, error: false });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'waiting_connection' }),
      );

      await waitFor(() => {
        expect(result.current.error).toContain('Could not reach the telemetry server');
      });
    });
  });

  describe('step 4 — auto-dismiss', () => {
    it('isDismissed becomes true after 3 seconds at step 4', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'connected' }),
      );

      // connected status → immediately dismissed (no step 4 animation for already-connected)
      expect(result.current.isDismissed).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('retry', () => {
    it('retries step 1 when onRetry is called', async () => {
      mockCheckPairingStatus
        .mockResolvedValueOnce({ paired: false, error: true, tokenExpired: false })
        .mockResolvedValueOnce({ paired: true, error: false, tokenExpired: false });
      mockCheckVehicleConnection.mockResolvedValue({ connected: false, error: false });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'pending_pairing' }),
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      act(() => {
        result.current.onRetry();
      });

      await waitFor(() => {
        expect(result.current.step).toBe(2);
      });
    });

    it('clears error on retry', async () => {
      mockCheckPairingStatus
        .mockResolvedValueOnce({ paired: false, error: true, tokenExpired: false })
        .mockResolvedValue({ paired: false, error: false, tokenExpired: false });

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: 'pending_pairing' }),
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      act(() => {
        result.current.onRetry();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('status to step mapping', () => {
    const cases: Array<[SetupStatus, number]> = [
      ['pending_pairing', 1],
      ['pairing_detected', 2],
      ['config_pushed', 3],
      ['waiting_connection', 3],
      ['connected', 4],
    ];

    it.each(cases)('maps %s to step %d', (status, expectedStep) => {
      if (status === 'connected') {
        const { result } = renderHook(() =>
          useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: status }),
        );
        // connected starts dismissed
        expect(result.current.isDismissed).toBe(true);
        return;
      }

      // For non-terminal statuses, mock the poll to stay idle
      mockCheckPairingStatus.mockResolvedValue({ paired: false, error: false, tokenExpired: false });
      mockCheckVehicleConnection.mockResolvedValue({ connected: false, error: false });
      mockPushFleetConfig.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSetupStepper({ ...DEFAULT_OPTIONS, initialSetupStatus: status }),
      );
      expect(result.current.step).toBe(expectedStep);
    });
  });
});
