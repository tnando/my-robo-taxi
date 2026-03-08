import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsScreen } from '@/features/settings/components/SettingsScreen';

import type { UserSettings } from '@/features/settings/types';

const baseSettings: UserSettings = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  teslaLinked: false,
  virtualKeyPaired: false,
  keyPairingReminderCount: 0,
  notifications: {
    driveStarted: true,
    driveCompleted: true,
    chargingComplete: false,
    viewerJoined: true,
  },
};

function renderScreen(overrides?: Partial<UserSettings>) {
  const props = {
    settings: { ...baseSettings, ...overrides },
    onSignOut: vi.fn(),
    onLinkTesla: vi.fn(),
    onUnlinkTesla: vi.fn(),
  };

  render(<SettingsScreen {...props} />);

  return props;
}

describe('SettingsScreen — Tesla Link/Unlink', () => {
  it('shows "Link" button when Tesla is not linked', () => {
    renderScreen();

    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlink' })).not.toBeInTheDocument();
  });

  it('shows "Unlink" button when Tesla is linked', () => {
    renderScreen({ teslaLinked: true, teslaVehicleName: 'Model Y' });

    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Link' })).not.toBeInTheDocument();
  });

  it('renders Link as a submit button inside a form', () => {
    renderScreen();

    const button = screen.getByRole('button', { name: 'Link' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button.closest('form')).toBeInTheDocument();
  });

  it('renders Unlink as a button that opens a confirmation dialog', async () => {
    renderScreen({ teslaLinked: true, teslaVehicleName: 'Model Y' });

    const button = screen.getByRole('button', { name: 'Unlink' });
    expect(button).toHaveAttribute('type', 'button');

    await userEvent.click(button);
    expect(screen.getByText('Unlink Tesla account?')).toBeInTheDocument();
  });

  it('shows linked vehicle name', () => {
    renderScreen({ teslaLinked: true, teslaVehicleName: 'Model Y' });

    expect(screen.getByText('Linked to Model Y')).toBeInTheDocument();
  });

  it('shows "Not linked" when Tesla is not linked', () => {
    renderScreen();

    expect(screen.getByText('Not linked')).toBeInTheDocument();
  });

  it('defaults to "Tesla" when linked without vehicle name', () => {
    renderScreen({ teslaLinked: true });

    expect(screen.getByText('Linked to Tesla')).toBeInTheDocument();
  });
});
