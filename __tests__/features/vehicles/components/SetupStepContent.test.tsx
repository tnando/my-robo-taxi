import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SetupStepContent } from '@/features/vehicles/components/SetupStepContent';

const defaultProps = {
  isLoading: false,
  error: null,
  showOfflineHelper: false,
  onRetry: vi.fn(),
};

describe('SetupStepContent', () => {
  describe('step 1 — pair virtual key', () => {
    it('renders pairing instructions', () => {
      render(<SetupStepContent {...defaultProps} step={1} />);
      expect(screen.getByText(/Open the Tesla app/)).toBeTruthy();
    });

    it('renders pairing link', () => {
      render(<SetupStepContent {...defaultProps} step={1} />);
      expect(screen.getByRole('link', { name: 'Open Pairing Link' })).toBeTruthy();
    });

    it('shows waiting indicator when loading', () => {
      render(<SetupStepContent {...defaultProps} step={1} isLoading={true} />);
      expect(screen.getByText(/Waiting for pairing/)).toBeTruthy();
    });

    it('hides waiting indicator when not loading', () => {
      render(<SetupStepContent {...defaultProps} step={1} isLoading={false} />);
      expect(screen.queryByText(/Waiting for pairing/)).toBeNull();
    });
  });

  describe('step 2 — configuring', () => {
    it('renders configuration copy', () => {
      render(<SetupStepContent {...defaultProps} step={2} />);
      expect(screen.getByText(/Pushing telemetry configuration/)).toBeTruthy();
    });
  });

  describe('step 3 — waiting for connection', () => {
    it('renders waiting copy', () => {
      render(<SetupStepContent {...defaultProps} step={3} />);
      expect(screen.getByText(/Waiting for your vehicle/)).toBeTruthy();
    });

    it('shows offline helper text after long wait', () => {
      render(<SetupStepContent {...defaultProps} step={3} showOfflineHelper={true} />);
      expect(screen.getByText(/taking longer than expected/)).toBeTruthy();
    });

    it('hides offline helper by default', () => {
      render(<SetupStepContent {...defaultProps} step={3} showOfflineHelper={false} />);
      expect(screen.queryByText(/taking longer than expected/)).toBeNull();
    });
  });

  describe('step 4 — connected', () => {
    it('renders connected success message', () => {
      render(<SetupStepContent {...defaultProps} step={4} />);
      expect(screen.getByText(/Live telemetry is now active/)).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('renders error message when error is present', () => {
      render(<SetupStepContent {...defaultProps} step={1} error="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('shows retry button on error', () => {
      render(<SetupStepContent {...defaultProps} step={1} error="Failed" />);
      expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    });

    it('calls onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(<SetupStepContent {...defaultProps} step={1} error="Failed" onRetry={onRetry} />);
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render error block when error is null', () => {
      render(<SetupStepContent {...defaultProps} step={1} error={null} />);
      expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    });
  });
});
