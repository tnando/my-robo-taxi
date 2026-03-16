import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VehicleDetailsBlock } from '@/features/vehicles/components/VehicleDetailsBlock';
import type { Vehicle } from '@/types/vehicle';

const vehicle: Vehicle = {
  id: 'v1',
  name: 'My Model Y',
  model: 'Model Y',
  year: 2024,
  color: 'Pearl White',
  licensePlate: 'ROBO 42',
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
  virtualKeyPaired: true,
};

describe('VehicleDetailsBlock', () => {
  it('renders the "Vehicle" section label', () => {
    render(<VehicleDetailsBlock vehicle={vehicle} />);
    expect(screen.getByText('Vehicle')).toBeInTheDocument();
  });

  it('renders year and model', () => {
    render(<VehicleDetailsBlock vehicle={vehicle} />);
    expect(screen.getByText('2024 Model Y')).toBeInTheDocument();
  });

  it('renders the color', () => {
    render(<VehicleDetailsBlock vehicle={vehicle} />);
    expect(screen.getByText('Pearl White')).toBeInTheDocument();
  });

  it('renders the license plate', () => {
    render(<VehicleDetailsBlock vehicle={vehicle} />);
    expect(screen.getByText('ROBO 42')).toBeInTheDocument();
  });
});
