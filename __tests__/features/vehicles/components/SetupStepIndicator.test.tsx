import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SetupStepIndicator } from '@/features/vehicles/components/SetupStepIndicator';
import type { SetupStep } from '@/features/vehicles/hooks/use-setup-stepper';

describe('SetupStepIndicator', () => {
  it('renders all four step labels', () => {
    render(<SetupStepIndicator currentStep={1} isLoading={false} />);
    expect(screen.getByText('Pair Virtual Key')).toBeTruthy();
    expect(screen.getByText('Configuring')).toBeTruthy();
    expect(screen.getByText('Connecting')).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();
  });

  it('marks the active step with aria-current="step"', () => {
    render(<SetupStepIndicator currentStep={2} isLoading={false} />);
    const stepTwoCircle = screen.getByText('2');
    expect(stepTwoCircle.closest('[aria-current="step"]')).toBeTruthy();
  });

  it('shows check marks for completed steps', () => {
    const { container } = render(<SetupStepIndicator currentStep={3} isLoading={false} />);
    // Steps 1 and 2 should have SVG check marks (no number text)
    const checkPaths = container.querySelectorAll('path[d="M2 6l3 3 5-5"]');
    expect(checkPaths).toHaveLength(2);
  });

  it('applies animate-pulse class when active step is loading', () => {
    const { container } = render(<SetupStepIndicator currentStep={1} isLoading={true} />);
    const stepOneCircle = container.querySelector('[aria-current="step"]');
    expect(stepOneCircle?.className).toContain('animate-pulse');
  });

  it('does not apply animate-pulse when not loading', () => {
    const { container } = render(<SetupStepIndicator currentStep={1} isLoading={false} />);
    const stepOneCircle = container.querySelector('[aria-current="step"]');
    expect(stepOneCircle?.className).not.toContain('animate-pulse');
  });

  const steps: SetupStep[] = [1, 2, 3, 4];
  it.each(steps)('renders without errors at step %d', (step) => {
    const { container } = render(<SetupStepIndicator currentStep={step} isLoading={false} />);
    expect(container.firstChild).toBeTruthy();
  });
});
