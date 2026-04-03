import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TripProgressBar } from '@/features/vehicles/components/TripProgressBar';
import type { TripStop } from '@/types/vehicle';

const stops: TripStop[] = [
  { name: 'Supercharger', address: '100 Charge Ave', type: 'charging' },
];

describe('TripProgressBar', () => {
  it('renders origin and destination labels', () => {
    render(
      <TripProgressBar progress={0.6} stops={[]} originLabel="Home" destinationLabel="Work" />,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders progress bar at the correct width', () => {
    const { container } = render(
      <TripProgressBar progress={0.75} stops={[]} originLabel="A" destinationLabel="B" />,
    );
    const filledBar = container.querySelector('[style*="width"]') as HTMLElement;
    expect(filledBar?.style.width).toBe('75%');
  });

  it('renders stop name labels', () => {
    render(
      <TripProgressBar progress={0.5} stops={stops} originLabel="A" destinationLabel="B" />,
    );
    // Stop names appear both as diamond markers (with title) and as labels below the bar
    const superchargerElements = screen.getAllByText('Supercharger');
    expect(superchargerElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders diamond markers for stops', () => {
    const { container } = render(
      <TripProgressBar progress={0.5} stops={stops} originLabel="A" destinationLabel="B" />,
    );
    // Diamond markers use the &#9670; character (◆)
    const markers = container.querySelectorAll('[title]');
    expect(markers.length).toBe(1);
    expect(markers[0].getAttribute('title')).toBe('Supercharger');
  });

  it('renders the pulsing leading-edge dot', () => {
    const { container } = render(
      <TripProgressBar progress={0.5} stops={[]} originLabel="A" destinationLabel="B" />,
    );
    const pulsingDot = container.querySelector('.animate-gold-glow');
    expect(pulsingDot).toBeTruthy();
  });

  it('shows skeletons for labels when route is transitioning', () => {
    const { container } = render(
      <TripProgressBar
        progress={0.5}
        stops={[]}
        originLabel="Home"
        destinationLabel="Work"
        isRouteTransitioning
      />,
    );
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Work')).not.toBeInTheDocument();
    const skeletons = container.querySelectorAll('[aria-label="Loading"]');
    expect(skeletons.length).toBe(2);
  });
});
