import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { Vehicle } from '@/types/vehicle';
import type { Drive } from '@/types/drive';
import { DrivingHalfContent } from '@/features/vehicles/components/DrivingHalfContent';

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
    heading: 0,
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

function makeDrive(overrides: Partial<Drive> = {}): Drive {
  return {
    id: 'd1',
    vehicleId: 'v1',
    date: '2026-03-27',
    startTime: '08:00',
    endTime: '08:30',
    startLocation: 'Home',
    endLocation: 'Office',
    startAddress: '',
    endAddress: '',
    distanceMiles: 20,
    maxSpeedMph: 70,
    avgSpeedMph: 50,
    durationMinutes: 25,
    energyUsedKwh: 5,
    startChargeLevel: 80,
    endChargeLevel: 75,
    fsdMiles: 0,
    fsdPercentage: 0,
    interventions: 0,
    routePoints: [],
    ...overrides,
  };
}

describe('DrivingHalfContent', () => {
  describe('Start label', () => {
    it('uses currentDrive.startAddress when available', () => {
      render(
        <DrivingHalfContent
          vehicle={makeVehicle()}
          currentDrive={makeDrive({ startAddress: '100 Oak St' })}
        />,
      );
      expect(screen.getByText('100 Oak St')).toBeInTheDocument();
    });

    it('falls back to currentDrive.startLocation when startAddress is empty', () => {
      render(
        <DrivingHalfContent
          vehicle={makeVehicle()}
          currentDrive={makeDrive({ startAddress: '', startLocation: 'Downtown' })}
        />,
      );
      expect(screen.getByText('Downtown')).toBeInTheDocument();
    });

    it('shows "Current location" when drive is absent (ignores Tesla nav origin)', () => {
      render(
        <DrivingHalfContent
          vehicle={makeVehicle({ originLatitude: 30.1234, originLongitude: -97.5678 })}
        />,
      );
      // Should NOT fall back to vehicle.originLatitude/originLongitude
      expect(screen.queryByText('30.1234, -97.5678')).not.toBeInTheDocument();
      expect(screen.getByText('Current location')).toBeInTheDocument();
    });

    it('shows "Current location" when no drive or coordinates are available', () => {
      render(<DrivingHalfContent vehicle={makeVehicle()} />);
      expect(screen.getByText('Current location')).toBeInTheDocument();
    });
  });

  describe('Destination label', () => {
    it('shows destinationName when present', () => {
      render(
        <DrivingHalfContent
          vehicle={makeVehicle({ destinationName: 'Whole Foods' })}
        />,
      );
      expect(screen.getByText('Whole Foods')).toBeInTheDocument();
    });

    it('shows empty destination when no name (no coordinate fallback)', () => {
      render(
        <DrivingHalfContent
          vehicle={makeVehicle({
            destinationName: undefined,
            destinationLatitude: 30.2672,
            destinationLongitude: -97.7431,
          })}
        />,
      );
      // Should NOT show raw coordinates
      expect(screen.queryByText(/30\.2672/)).not.toBeInTheDocument();
    });

    it('appends destinationAddress after em-dash when present', () => {
      render(
        <DrivingHalfContent
          vehicle={makeVehicle({
            destinationName: 'Airport',
            destinationAddress: '3600 Presidential Blvd',
          })}
        />,
      );
      expect(screen.getByText(/Airport — 3600 Presidential Blvd/)).toBeInTheDocument();
    });

    it('shows destination without em-dash when destinationAddress is absent', () => {
      render(
        <DrivingHalfContent
          vehicle={makeVehicle({ destinationName: 'Airport' })}
        />,
      );
      expect(screen.queryByText(/—/)).not.toBeInTheDocument();
    });
  });

  it('renders odometer value', () => {
    render(<DrivingHalfContent vehicle={makeVehicle({ odometerMiles: 12345 })} />);
    expect(screen.getByText('12,345 mi')).toBeInTheDocument();
  });

  it('shows skeletons for start and destination when route is transitioning', () => {
    const { container } = render(
      <DrivingHalfContent
        vehicle={makeVehicle({ destinationName: 'Airport' })}
        currentDrive={makeDrive({ startAddress: '100 Oak St' })}
        isRouteTransitioning
      />,
    );
    expect(screen.queryByText('100 Oak St')).not.toBeInTheDocument();
    expect(screen.queryByText('Airport')).not.toBeInTheDocument();
    const skeletons = container.querySelectorAll('[aria-label="Loading"]');
    expect(skeletons.length).toBe(2);
  });
});
