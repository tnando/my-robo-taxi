import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VirtualKeyPairingDialog } from '@/features/settings/components/VirtualKeyPairingDialog';

function renderDialog(overrides?: Partial<{ open: boolean; onDefer: () => void }>) {
  const props = {
    open: true,
    onDefer: vi.fn(),
    ...overrides,
  };

  render(<VirtualKeyPairingDialog {...props} />);
  return props;
}

describe('VirtualKeyPairingDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByText('Pair Your Virtual Key')).not.toBeInTheDocument();
  });

  it('renders title and description when open', () => {
    renderDialog();

    expect(screen.getByText('Pair Your Virtual Key')).toBeInTheDocument();
    expect(screen.getByText(/live location, temps, and vehicle details/)).toBeInTheDocument();
  });

  it('renders prerequisites list', () => {
    renderDialog();

    expect(screen.getByText('Tesla app installed')).toBeInTheDocument();
    expect(screen.getByText('Bluetooth enabled')).toBeInTheDocument();
    expect(screen.getByText('Within 30 feet of your car')).toBeInTheDocument();
  });

  it('renders "Open Tesla App to Pair" link with correct href', () => {
    renderDialog();

    const link = screen.getByRole('link', { name: 'Open Tesla App to Pair' });
    expect(link).toHaveAttribute('href', 'https://tesla.com/_ak/myrobotaxi.app');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders "Remind Me Later" button', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Remind Me Later' })).toBeInTheDocument();
  });

  it('calls onDefer when "Remind Me Later" is clicked', async () => {
    const props = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Remind Me Later' }));

    expect(props.onDefer).toHaveBeenCalledOnce();
  });

  it('calls onDefer on Escape key', async () => {
    const props = renderDialog();

    await userEvent.keyboard('{Escape}');

    expect(props.onDefer).toHaveBeenCalledOnce();
  });

  it('has proper ARIA attributes', () => {
    renderDialog();

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'pairing-dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'pairing-dialog-desc');
  });
});
