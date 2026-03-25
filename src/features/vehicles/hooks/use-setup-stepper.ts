'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { checkPairingStatus, checkVehicleConnection, updateSetupStatus } from '../api/setup-actions';
import { pushFleetConfig } from '../api/fleet-config';
import type { SetupStatus } from '@/types/vehicle';
import {
  PAIRING_POLL_BASE_MS,
  PAIRING_POLL_MAX_MS,
  PAIRING_POLL_MULTIPLIER,
  CONNECTION_POLL_INTERVAL_MS,
  OFFLINE_HELPER_DELAY_MS,
  CONNECTED_AUTO_DISMISS_MS,
  statusToStep,
} from '../lib/setup-constants';
export type { SetupStep, SetupStepperState } from '../lib/setup-constants';

export interface UseSetupStepperOptions {
  vehicleId: string;
  vin: string;
  userId: string;
  initialSetupStatus: SetupStatus;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the vehicle onboarding stepper state.
 *
 * - Step 1: Poll Tesla fleet_status with exponential backoff for pairing
 * - Step 2: Auto-push fleet telemetry config (fires once, no user interaction)
 * - Step 3: Poll telemetry server every 5s until vehicle sends data
 * - Step 4: Show "Connected!" for 3s then auto-dismiss
 */
export function useSetupStepper({
  vehicleId,
  vin,
  userId,
  initialSetupStatus,
}: UseSetupStepperOptions) {
  const [step, setStep] = useState(statusToStep(initialSetupStatus));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOfflineHelper, setShowOfflineHelper] = useState(false);
  const [isDismissed, setIsDismissed] = useState(initialSetupStatus === 'connected');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptRef = useRef(0);
  const stoppedRef = useRef(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
  }, []);

  // ── Step 1: Poll Tesla fleet_status with exponential backoff ─────────────

  const startPairingPoll = useCallback(() => {
    stoppedRef.current = false;
    pollAttemptRef.current = 0;

    async function poll() {
      if (stoppedRef.current) return;
      setIsLoading(true);

      const result = await checkPairingStatus(vin);

      if (stoppedRef.current) return;

      if (result.tokenExpired) {
        setIsLoading(false);
        setError('Your Tesla session has expired. Please re-link your Tesla account in Settings.');
        return;
      }

      if (result.paired) {
        setIsLoading(false);
        setError(null);
        await updateSetupStatus(vehicleId, 'pairing_detected');
        setStep(2);
        return;
      }

      if (result.error) {
        setIsLoading(false);
        setError('Could not reach Tesla. Check your connection and try again.');
        return;
      }

      // Not paired yet — schedule next poll with exponential backoff
      const delay = Math.min(
        PAIRING_POLL_BASE_MS * PAIRING_POLL_MULTIPLIER ** pollAttemptRef.current,
        PAIRING_POLL_MAX_MS,
      );
      pollAttemptRef.current++;
      setIsLoading(false);

      if (!stoppedRef.current) {
        timerRef.current = setTimeout(poll, delay);
      }
    }

    poll();
  }, [vin, vehicleId]);

  // ── Step 2: Auto-push fleet config ───────────────────────────────────────

  const runConfigPush = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await pushFleetConfig(userId, vin);
      await updateSetupStatus(vehicleId, 'config_pushed');
    } catch {
      // Fleet config push errors are non-fatal — move to Step 3 anyway.
      // The telemetry server handles repeated pushes idempotently.
    }

    if (stoppedRef.current) return;
    await updateSetupStatus(vehicleId, 'waiting_connection');
    setIsLoading(false);
    setStep(3);
  }, [userId, vin, vehicleId]);

  // ── Step 3: Poll telemetry server every 5s ───────────────────────────────

  const startConnectionPoll = useCallback(() => {
    stoppedRef.current = false;

    offlineTimerRef.current = setTimeout(() => {
      setShowOfflineHelper(true);
    }, OFFLINE_HELPER_DELAY_MS);

    async function poll() {
      if (stoppedRef.current) return;
      setIsLoading(true);

      const result = await checkVehicleConnection(vehicleId, vin);

      if (stoppedRef.current) return;

      if (result.connected) {
        setIsLoading(false);
        setError(null);
        setStep(4);
        return;
      }

      if (result.error) {
        setIsLoading(false);
        setError('Could not reach the telemetry server. Retrying...');
        // Retry after interval despite error
      } else {
        setIsLoading(false);
      }

      if (!stoppedRef.current) {
        timerRef.current = setTimeout(poll, CONNECTION_POLL_INTERVAL_MS);
      }
    }

    poll();
  }, [vehicleId, vin]);

  // ── Step 4: Auto-dismiss after 3s ────────────────────────────────────────

  useEffect(() => {
    if (step !== 4) return;
    const t = setTimeout(() => setIsDismissed(true), CONNECTED_AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [step]);

  // ── Effect: drive each step ───────────────────────────────────────────────

  useEffect(() => {
    if (step === 1) {
      startPairingPoll();
      return clearTimers;
    }
    if (step === 2) {
      runConfigPush();
      return clearTimers;
    }
    if (step === 3) {
      startConnectionPoll();
      return clearTimers;
    }
    return undefined;
    // Dependencies are stable callbacks — only re-run when step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Retry: restart the current step ──────────────────────────────────────

  const onRetry = useCallback(() => {
    clearTimers();
    stoppedRef.current = false;
    setError(null);
    setShowOfflineHelper(false);

    // Re-trigger effect by creating a new effect cycle
    if (step === 1) startPairingPoll();
    if (step === 2) runConfigPush();
    if (step === 3) startConnectionPoll();
  }, [step, clearTimers, startPairingPoll, runConfigPush, startConnectionPoll]);

  return {
    step,
    isLoading,
    error,
    showOfflineHelper,
    isDismissed,
    onRetry,
  };
}
