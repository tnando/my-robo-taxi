import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HomeSyncingScreen } from '@/features/vehicles/components/HomeSyncingScreen';
import type { Vehicle } from '@/types/vehicle';

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// Mock the polling hook to control its output
vi.mock('@/features/vehicles/hooks/use-vehicle-polling', () => ({
  useVehiclePolling: vi.fn(),
}));

import { useVehiclePolling } from '@/features/vehicles/hooks/use-vehicle-polling';
const mockUseVehiclePolling = vi.mocked(useVehiclePolling);

function createMockVehicle(): Vehicle {
  return {
    id: 'v1',
    name: 'Test Car',
    model: 'Model 3',
    year: 2024,
    color: 'white',
    licensePlate: 'ABC123',
    chargeLevel: 80,
    estimatedRange: 250,
    status: 'parked',
    speed: 0,
    heading: 0,
    locationName: 'Home',
    locationAddress: '123 Main St',
    latitude: 30.267,
    longitude: -97.743,
    interiorTemp: 72,
    exteriorTemp: 85,
    lastUpdated: new Date().toISOString(),
    odometerMiles: 10000,
    fsdMilesToday: 0,
    virtualKeyPaired: true,
    gearPosition: null,
  };
}

describe('HomeSyncingScreen', () => {
  const defaultProps = {
    fetchVehicles: vi.fn().mockResolvedValue([]),
    onLinkTesla: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    mockRefresh.mockClear();
  });

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

  it('calls router.refresh() when vehicles are found', () => {
    mockUseVehiclePolling.mockReturnValue({
      vehicles: [createMockVehicle()],
      isPolling: false,
      timedOut: false,
    });

    render(<HomeSyncingScreen {...defaultProps} />);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('has aria-live region for screen reader announcements', () => {
    mockUseVehiclePolling.mockReturnValue({
      vehicles: [],
      isPolling: true,
      timedOut: false,
    });

    const { container } = render(<HomeSyncingScreen {...defaultProps} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });
});
