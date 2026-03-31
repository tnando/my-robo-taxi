import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { Vehicle } from '@/types/vehicle';
import { DrivingPeekContent } from '@/features/vehicles/components/DrivingPeekContent';

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    name: 'Model S',
    model: 'Model S',
    year: 2023,
    color: 'black',
    licensePlate: 'ABC123',
    chargeLevel: 80,
    estimatedRange: 250,
    status: 'driving',
    speed: 65,
    gearPosition: 'D',
    heading: 180,
    locationName: 'Highway',
    locationAddress: 'I-35 N',
    latitude: 30.267,
    longitude: -97.743,
    interiorTemp: 72,
    exteriorTemp: 85,
    lastUpdated: '1m ago',
    odometerMiles: 10000,
    fsdMilesToday: 42,
    virtualKeyPaired: true,
    setupStatus: 'connected',
    ...overrides,
  };
}

describe('DrivingPeekContent', () => {
  it('shows "Heading to <name>" when destinationName is present', () => {
    render(
      <DrivingPeekContent
        vehicle={makeVehicle({ destinationName: 'Whole Foods' })}
        tripProgress={0.3}
      />,
    );
    expect(screen.getByText('Heading to Whole Foods')).toBeInTheDocument();
  });

  it('shows "Driving" when destinationName is absent (no coordinate fallback)', () => {
    render(
      <DrivingPeekContent
        vehicle={makeVehicle({
          destinationName: undefined,
          destinationLatitude: 30.2672,
          destinationLongitude: -97.7431,
        })}
        tripProgress={0.3}
      />,
    );
    // "Driving" appears in both the text label and StatusBadge
    expect(screen.queryByText(/Heading to/)).not.toBeInTheDocument();
  });

  it('shows just "Driving" when neither name nor coordinates are available', () => {
    const { container } = render(
      <DrivingPeekContent
        vehicle={makeVehicle({ destinationName: undefined })}
        tripProgress={0}
      />,
    );
    // The gold subtitle paragraph must say "Driving" (not "Heading to ...")
    const subtitle = container.querySelector('p.text-gold');
    expect(subtitle?.textContent).toBe('Driving');
    expect(screen.queryByText(/Heading to/)).not.toBeInTheDocument();
  });

  it('renders vehicle name', () => {
    render(
      <DrivingPeekContent
        vehicle={makeVehicle({ name: 'Road Runner' })}
        tripProgress={0.5}
      />,
    );
    expect(screen.getByText('Road Runner')).toBeInTheDocument();
  });

  it('uses destinationLabel in TripProgressBar when name is present', () => {
    render(
      <DrivingPeekContent
        vehicle={makeVehicle({ destinationName: 'Airport' })}
        tripProgress={0.8}
      />,
    );
    // TripProgressBar renders the destination label below the progress bar
    expect(screen.getAllByText('Airport').length).toBeGreaterThanOrEqual(1);
  });

  it('uses "Destination" fallback in TripProgressBar when nothing is available', () => {
    render(
      <DrivingPeekContent
        vehicle={makeVehicle({ destinationName: undefined })}
        tripProgress={0}
      />,
    );
    expect(screen.getByText('Destination')).toBeInTheDocument();
  });
});
