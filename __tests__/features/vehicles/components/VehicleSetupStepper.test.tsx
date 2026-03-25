import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { VehicleSetupStepper } from '@/features/vehicles/components/VehicleSetupStepper';
import type { Vehicle } from '@/types/vehicle';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/vehicles/hooks/use-setup-stepper', () => ({
  useSetupStepper: vi.fn().mockReturnValue({
    step: 1,
    isLoading: false,
    error: null,
    showOfflineHelper: false,
    isDismissed: false,
    onRetry: vi.fn(),
  }),
}));

import { useSetupStepper } from '@/features/vehicles/hooks/use-setup-stepper';
const mockUseSetupStepper = vi.mocked(useSetupStepper);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    vin: '5YJYE1EA1SF000001',
    name: 'My Tesla',
    model: 'Model Y',
    year: 2024,
    color: 'White',
    licensePlate: 'ABC123',
    chargeLevel: 80,
    estimatedRange: 250,
    status: 'parked',
    speed: 0,
    gearPosition: null,
    heading: 0,
    locationName: 'Home',
    locationAddress: '123 Main St',
    latitude: 37.7749,
    longitude: -122.4194,
    interiorTemp: 72,
    exteriorTemp: 68,
    lastUpdated: '2024-01-01T12:00:00Z',
    odometerMiles: 15000,
    fsdMilesToday: 0,
    virtualKeyPaired: false,
    setupStatus: 'pending_pairing',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VehicleSetupStepper', () => {
  it('renders the setup heading', () => {
    render(<VehicleSetupStepper vehicle={makeVehicle()} userId="user-1" />);
    expect(screen.getByText('Complete Vehicle Setup')).toBeTruthy();
  });

  it('has role="status" for accessibility', () => {
    render(<VehicleSetupStepper vehicle={makeVehicle()} userId="user-1" />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders nothing when isDismissed is true', () => {
    mockUseSetupStepper.mockReturnValueOnce({
      step: 4,
      isLoading: false,
      error: null,
      showOfflineHelper: false,
      isDismissed: true,
      onRetry: vi.fn(),
    });
    const { container } = render(<VehicleSetupStepper vehicle={makeVehicle()} userId="user-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('passes vehicleId, vin, and userId to the hook', () => {
    const vehicle = makeVehicle({ vin: 'TESTVIN123' });
    render(<VehicleSetupStepper vehicle={vehicle} userId="user-42" />);
    expect(mockUseSetupStepper).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'v1',
        vin: 'TESTVIN123',
        userId: 'user-42',
      }),
    );
  });

  it('passes empty string for vin when vehicle vin is missing', () => {
    const vehicle = makeVehicle({ vin: undefined });
    render(<VehicleSetupStepper vehicle={vehicle} userId="user-1" />);
    expect(mockUseSetupStepper).toHaveBeenCalledWith(
      expect.objectContaining({ vin: '' }),
    );
  });
});
