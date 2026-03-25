'use client';

import type { SetupStep } from '../hooks/use-setup-stepper';

export interface SetupStepIndicatorProps {
  currentStep: SetupStep;
  isLoading: boolean;
}

const STEP_LABELS: Record<SetupStep, string> = {
  1: 'Pair Virtual Key',
  2: 'Configuring',
  3: 'Connecting',
  4: 'Connected',
};

/**
 * Horizontal step indicator showing the 4-step onboarding progress.
 * Active step is gold; completed steps are dim gold; future steps are muted.
 */
export function SetupStepIndicator({ currentStep, isLoading }: SetupStepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 w-full mb-4">
      {([1, 2, 3, 4] as SetupStep[]).map((step, index) => {
        const isComplete = step < currentStep;
        const isActive = step === currentStep;
        const isFuture = step > currentStep;

        return (
          <div key={step} className="flex items-center flex-1">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  isComplete ? 'bg-gold/40 text-gold' : '',
                  isActive && !isLoading ? 'bg-gold text-bg-primary' : '',
                  isActive && isLoading ? 'bg-gold text-bg-primary animate-pulse' : '',
                  isFuture ? 'bg-bg-elevated text-text-muted' : '',
                ].filter(Boolean).join(' ')}
                aria-current={isActive ? 'step' : undefined}
              >
                {isComplete ? (
                  <CheckIcon />
                ) : (
                  <span>{step}</span>
                )}
              </div>
              <span
                className={[
                  'text-[10px] font-medium whitespace-nowrap',
                  isActive ? 'text-gold' : '',
                  isComplete ? 'text-gold/60' : '',
                  isFuture ? 'text-text-muted' : '',
                ].filter(Boolean).join(' ')}
              >
                {STEP_LABELS[step]}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {index < 3 && (
              <div
                className={[
                  'flex-1 h-px mx-1 mb-4 transition-colors',
                  isComplete ? 'bg-gold/40' : 'bg-border-default',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
