import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StopsList } from '@/features/vehicles/components/StopsList';
import type { TripStop } from '@/types/vehicle';

const stops: TripStop[] = [
  { name: 'Supercharger', address: '100 Charge Ave', type: 'charging' },
  { name: 'Coffee Shop', address: '200 Bean St', type: 'waypoint' },
];

describe('StopsList', () => {
  it('returns null when stops is empty', () => {
    const { container } = render(<StopsList stops={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the "Stops" section label', () => {
    render(<StopsList stops={stops} />);
    expect(screen.getByText('Stops')).toBeInTheDocument();
  });

  it('renders each stop name', () => {
    render(<StopsList stops={stops} />);
    expect(screen.getByText('Supercharger')).toBeInTheDocument();
    expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
  });

  it('renders each stop address', () => {
    render(<StopsList stops={stops} />);
    expect(screen.getByText('100 Charge Ave')).toBeInTheDocument();
    expect(screen.getByText('200 Bean St')).toBeInTheDocument();
  });

  it('renders a bolt icon for charging stops', () => {
    const { container } = render(<StopsList stops={[stops[0]]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    const className = svg?.getAttribute('class') ?? '';
    expect(className).toContain('text-gold');
  });

  it('renders a dot for waypoint stops', () => {
    const { container } = render(<StopsList stops={[stops[1]]} />);
    const dot = container.querySelector('.rounded-full.bg-text-muted');
    expect(dot).toBeTruthy();
  });
});
