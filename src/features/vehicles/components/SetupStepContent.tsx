'use client';

import { TESLA_KEY_PAIRING_URL } from '@/lib/constants';

import type { SetupStep } from '../hooks/use-setup-stepper';

export interface SetupStepContentProps {
  step: SetupStep;
  isLoading: boolean;
  error: string | null;
  showOfflineHelper: boolean;
  onRetry: () => void;
}

/**
 * Renders the description, action buttons, and status text for each step
 * of the vehicle onboarding stepper.
 */
export function SetupStepContent({
  step,
  isLoading,
  error,
  showOfflineHelper,
  onRetry,
}: SetupStepContentProps) {
  return (
    <div className="space-y-3">
      {/* Per-step instructions */}
      {step === 1 && <StepOneCopy isLoading={isLoading} />}
      {step === 2 && <StepTwoCopy />}
      {step === 3 && <StepThreeCopy showOfflineHelper={showOfflineHelper} />}
      {step === 4 && <StepFourCopy />}

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">
          <p className="text-xs text-red-400 font-light flex-1">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-xs text-gold font-medium hover:text-gold-light transition-colors whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// ── Per-step copy ─────────────────────────────────────────────────────────────

interface StepOneCopyProps {
  isLoading: boolean;
}

function StepOneCopy({ isLoading }: StepOneCopyProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-light text-text-secondary leading-relaxed">
        Open the Tesla app and add MyRoboTaxi as a virtual key driver.
      </p>
      <div className="flex items-center gap-2">
        <a
          href={TESLA_KEY_PAIRING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg border border-gold text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
        >
          Open Pairing Link
        </a>
        {isLoading && (
          <span className="text-xs text-text-muted flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold/60 animate-pulse" />
            Waiting for pairing...
          </span>
        )}
      </div>
    </div>
  );
}

function StepTwoCopy() {
  return (
    <p className="text-xs font-light text-text-secondary leading-relaxed">
      Pushing telemetry configuration to your vehicle. This usually takes a few seconds.
    </p>
  );
}

interface StepThreeCopyProps {
  showOfflineHelper: boolean;
}

function StepThreeCopy({ showOfflineHelper }: StepThreeCopyProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-light text-text-secondary leading-relaxed">
        Waiting for your vehicle to send its first telemetry packet.
      </p>
      {showOfflineHelper && (
        <p className="text-xs font-light text-text-muted leading-relaxed">
          This is taking longer than expected. Your vehicle may be parked in a low-signal area or
          in a deep sleep. Try driving a short distance to wake it up.
        </p>
      )}
    </div>
  );
}

function StepFourCopy() {
  return (
    <p className="text-xs font-semibold text-status-driving">
      Live telemetry is now active. Your vehicle data will update in real time.
    </p>
  );
}
