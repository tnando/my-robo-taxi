import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { VehicleCardCarousel } from '@/features/vehicles/components/VehicleCardCarousel';
import type { Vehicle } from '@/types/vehicle';

// Mock the useRelativeTime hook so we don't need fake timers for component tests
vi.mock('@/features/vehicles/hooks/use-relative-time', () => ({
  useRelativeTime: vi.fn().mockReturnValue({ text: '2m ago', isFresh: true }),
}));

// Mock StatusBadge to simplify assertions
vi.mock('@/components/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

// Mock vehicle-helpers to avoid importing the full module
vi.mock('@/lib/vehicle-helpers', () => ({
  getBatteryColor: () => 'bg-battery-high',
  getBatteryTextColor: () => 'text-battery-high',
}));

function makeVehicle(id: string, name: string, overrides: Partial<Vehicle> = {}): Vehicle {
  return {
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
    lastUpdated: '2026-03-24T12:00:00Z',
    odometerMiles: 15000,
    fsdMilesToday: 0,
    virtualKeyPaired: true,
    ...overrides,
  };
}

const twoVehicles = [
  makeVehicle('v1', 'Model Y'),
  makeVehicle('v2', 'Model 3', { model: 'Model 3', chargeLevel: 60 }),
];

const threeVehicles = [
  ...twoVehicles,
  makeVehicle('v3', 'Cybertruck', { model: 'Cybertruck', chargeLevel: 95 }),
];

describe('VehicleCardCarousel', () => {
  it('returns null when there is only one vehicle', () => {
    const { container } = render(
      <VehicleCardCarousel
        vehicles={[twoVehicles[0]]}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when vehicles array is empty', () => {
    const { container } = render(
      <VehicleCardCarousel vehicles={[]} currentIndex={0} onSelect={() => {}} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders cards for multiple vehicles', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('Model Y')).toBeInTheDocument();
    expect(screen.getByText('Model 3')).toBeInTheDocument();
  });

  it('renders a card for each vehicle in a larger list', () => {
    render(
      <VehicleCardCarousel
        vehicles={threeVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('Model Y')).toBeInTheDocument();
    expect(screen.getByText('Model 3')).toBeInTheDocument();
    expect(screen.getByText('Cybertruck')).toBeInTheDocument();
  });

  it('calls onSelect with the correct index when a card is tapped', () => {
    const onSelect = vi.fn();
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={onSelect}
      />,
    );

    // Tap the second card
    fireEvent.click(screen.getByText('Model 3'));

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('calls onSelect with index 0 when the first card is tapped', () => {
    const onSelect = vi.fn();
    render(
      <VehicleCardCarousel
        vehicles={threeVehicles}
        currentIndex={1}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('Model Y'));

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('renders a tablist role on the scroll container', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('has aria-label "Vehicle selector" on the tablist', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByLabelText('Vehicle selector')).toBeInTheDocument();
  });

  it('renders each card as a tab with role="tab"', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
  });

  it('sets aria-selected=true on the active card', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('sets aria-selected correctly when second card is active', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={1}
        onSelect={() => {}}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('includes vehicle name and status in card aria-label', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByLabelText('Model Y — parked')).toBeInTheDocument();
    expect(screen.getByLabelText('Model 3 — parked')).toBeInTheDocument();
  });

  it('renders battery percentage for each vehicle', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders relative time text in each card', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    // The mocked useRelativeTime returns '2m ago' for all cards
    const timestamps = screen.getAllByText('2m ago');
    expect(timestamps).toHaveLength(2);
  });

  it('applies active styling to the current card and inactive to others', () => {
    render(
      <VehicleCardCarousel
        vehicles={twoVehicles}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    // Active card has gold border
    expect(tabs[0].className).toContain('border-gold/30');
    // Inactive card has default border and reduced opacity
    expect(tabs[1].className).toContain('opacity-70');
  });
});
