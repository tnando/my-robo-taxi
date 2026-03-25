'use client';

import type { Vehicle } from '@/types/vehicle';

import { useSetupStepper } from '../hooks/use-setup-stepper';
import { SetupStepIndicator } from './SetupStepIndicator';
import { SetupStepContent } from './SetupStepContent';

export interface VehicleSetupStepperProps {
  vehicle: Vehicle;
  /** The authenticated user's ID — passed from the server to avoid a client-side auth call. */
  userId: string;
}

/**
 * 4-step onboarding stepper replacing the "Pair Virtual Key" banner.
 * Shown inside the bottom sheet when setupStatus is not 'connected'.
 *
 * Steps:
 * 1. Pair Virtual Key — polls Tesla fleet_status with exponential backoff
 * 2. Configuring Vehicle — auto-pushes fleet telemetry config
 * 3. Waiting for Connection — polls telemetry server every 5s
 * 4. Connected — shows success state, auto-dismisses after 3s
 */
export function VehicleSetupStepper({ vehicle, userId }: VehicleSetupStepperProps) {
  const vin = vehicle.vin ?? '';

  const { step, isLoading, error, showOfflineHelper, isDismissed, onRetry } = useSetupStepper({
    vehicleId: vehicle.id,
    vin,
    userId,
    initialSetupStatus: vehicle.setupStatus,
  });

  if (isDismissed) return null;

  return (
    <div
      role="status"
      aria-label="Vehicle setup progress"
      className="bg-bg-surface border border-border-default rounded-xl px-4 py-3 animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <SetupIcon />
        <p className="text-sm font-semibold text-text-primary">Complete Vehicle Setup</p>
      </div>

      {/* Step indicator */}
      <SetupStepIndicator currentStep={step} isLoading={isLoading} />

      {/* Step-specific content */}
      <SetupStepContent
        step={step}
        isLoading={isLoading}
        error={error}
        showOfflineHelper={showOfflineHelper}
        onRetry={onRetry}
      />
    </div>
  );
}

function SetupIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className="text-gold shrink-0"
      aria-hidden="true"
    >
      <path
        d="M9 1.5A7.5 7.5 0 1 1 1.5 9 7.5 7.5 0 0 1 9 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9 5.5v4l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
