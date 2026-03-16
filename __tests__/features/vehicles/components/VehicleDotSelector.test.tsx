import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VehicleDotSelector } from '@/features/vehicles/components/VehicleDotSelector';
import type { Vehicle } from '@/types/vehicle';

const makeVehicle = (id: string, name: string): Vehicle => ({
  id,
  name,
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
  virtualKeyPaired: true,
});

const vehicles = [makeVehicle('v1', 'Model Y'), makeVehicle('v2', 'Model 3')];

describe('VehicleDotSelector', () => {
  it('renders nothing when there is only one vehicle', () => {
    const { container } = render(
      <VehicleDotSelector vehicles={[vehicles[0]]} currentIndex={0} onSelect={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dot buttons for multiple vehicles', () => {
    render(<VehicleDotSelector vehicles={vehicles} currentIndex={0} onSelect={() => {}} />);
    expect(screen.getByLabelText('Select Model Y')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Model 3')).toBeInTheDocument();
  });

  it('calls onSelect with the correct index', () => {
    const onSelect = vi.fn();
    render(<VehicleDotSelector vehicles={vehicles} currentIndex={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByLabelText('Select Model 3'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('applies wider style to the active dot', () => {
    render(<VehicleDotSelector vehicles={vehicles} currentIndex={0} onSelect={() => {}} />);
    const activeDot = screen.getByLabelText('Select Model Y');
    expect(activeDot.className).toContain('w-6');
    expect(activeDot.className).toContain('bg-gold');
  });

  it('applies narrow style to inactive dots', () => {
    render(<VehicleDotSelector vehicles={vehicles} currentIndex={0} onSelect={() => {}} />);
    const inactiveDot = screen.getByLabelText('Select Model 3');
    expect(inactiveDot.className).toContain('w-2');
  });
});
