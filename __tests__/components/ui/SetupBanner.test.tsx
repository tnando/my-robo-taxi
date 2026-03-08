import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SetupBanner } from '@/components/ui/SetupBanner';

const defaultProps = {
  title: 'Complete Setup',
  description: 'Pair your virtual key to unlock live data',
  actionLabel: 'Pair Now',
  onAction: vi.fn(),
};

function renderBanner(overrides?: Partial<typeof defaultProps & { onDismiss: () => void }>) {
  const props = { ...defaultProps, ...overrides };
  render(<SetupBanner {...props} />);
  return props;
}

describe('SetupBanner', () => {
  it('renders title and description', () => {
    renderBanner();

    expect(screen.getByText('Complete Setup')).toBeInTheDocument();
    expect(screen.getByText('Pair your virtual key to unlock live data')).toBeInTheDocument();
  });

  it('renders the action button with correct label', () => {
    renderBanner();

    expect(screen.getByRole('button', { name: 'Pair Now' })).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', async () => {
    const props = renderBanner();

    await userEvent.click(screen.getByRole('button', { name: 'Pair Now' }));

    expect(props.onAction).toHaveBeenCalledOnce();
  });

  it('does not render dismiss button when onDismiss is not provided', () => {
    renderBanner();

    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

  it('renders dismiss button when onDismiss is provided', () => {
    renderBanner({ onDismiss: vi.fn() });

    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    renderBanner({ onDismiss });

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('has role="status" for accessibility', () => {
    renderBanner();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
