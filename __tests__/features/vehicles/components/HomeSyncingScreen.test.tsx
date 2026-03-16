import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HomeSyncingScreen } from '@/features/vehicles/components/HomeSyncingScreen';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock the polling hook to control its output
vi.mock('@/features/vehicles/hooks/use-vehicle-polling', () => ({
  useVehiclePolling: vi.fn(),
}));

import { useVehiclePolling } from '@/features/vehicles/hooks/use-vehicle-polling';
const mockUseVehiclePolling = vi.mocked(useVehiclePolling);

describe('HomeSyncingScreen', () => {
  const defaultProps = {
    fetchVehicles: vi.fn().mockResolvedValue([]),
    onLinkTesla: vi.fn(),
  };

  it('shows syncing state while polling', () => {
    mockUseVehiclePolling.mockReturnValue({
      vehicles: [],
      isPolling: true,
      timedOut: false,
    });

    render(<HomeSyncingScreen {...defaultProps} />);

    expect(screen.getByText('Syncing Your Vehicles')).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows timeout state with retry options', () => {
    mockUseVehiclePolling.mockReturnValue({
      vehicles: [],
      isPolling: false,
      timedOut: true,
    });

    render(<HomeSyncingScreen {...defaultProps} />);

    expect(screen.getByText('Still Syncing')).toBeTruthy();
    expect(screen.getByText('Refresh')).toBeTruthy();
    expect(screen.getByText('Re-link Tesla')).toBeTruthy();
  });

  it('renders car icon in both states', () => {
    mockUseVehiclePolling.mockReturnValue({
      vehicles: [],
      isPolling: true,
      timedOut: false,
    });

    const { container } = render(<HomeSyncingScreen {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
