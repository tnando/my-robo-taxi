import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatRow } from '@/features/vehicles/components/StatRow';

describe('StatRow', () => {
  it('renders speed value', () => {
    render(<StatRow speed={45} chargeLevel={80} />);
    expect(screen.getByText('45 mph')).toBeInTheDocument();
  });

  it('renders battery percentage', () => {
    render(<StatRow speed={0} chargeLevel={72} />);
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('renders ETA when provided', () => {
    render(<StatRow etaMinutes={12} speed={65} chargeLevel={55} />);
    expect(screen.getByText('12 min')).toBeInTheDocument();
    expect(screen.getByText('ETA')).toBeInTheDocument();
  });

  it('does not render ETA when not provided', () => {
    render(<StatRow speed={0} chargeLevel={50} />);
    expect(screen.queryByText('ETA')).toBeNull();
  });

  it('renders Speed and Battery labels', () => {
    render(<StatRow speed={30} chargeLevel={60} />);
    expect(screen.getByText('Speed')).toBeInTheDocument();
    expect(screen.getByText('Battery')).toBeInTheDocument();
  });

  it('applies green color class for high battery', () => {
    const { container } = render(<StatRow speed={0} chargeLevel={80} />);
    const batteryValue = screen.getByText('80%');
    expect(batteryValue.className).toContain('text-battery-high');
  });

  it('applies yellow color class for mid battery', () => {
    render(<StatRow speed={0} chargeLevel={35} />);
    const batteryValue = screen.getByText('35%');
    expect(batteryValue.className).toContain('text-battery-mid');
  });

  it('applies red color class for low battery', () => {
    render(<StatRow speed={0} chargeLevel={15} />);
    const batteryValue = screen.getByText('15%');
    expect(batteryValue.className).toContain('text-battery-low');
  });

  it('shows skeleton for ETA when route is transitioning', () => {
    const { container } = render(
      <StatRow etaMinutes={12} speed={65} chargeLevel={55} isRouteTransitioning />,
    );
    // ETA value should be replaced by skeleton
    expect(screen.queryByText('12 min')).not.toBeInTheDocument();
    // ETA label still visible
    expect(screen.getByText('ETA')).toBeInTheDocument();
    // Skeleton element present
    expect(container.querySelector('[aria-label="Loading"]')).toBeTruthy();
  });

  it('does not show skeleton when not transitioning', () => {
    const { container } = render(
      <StatRow etaMinutes={12} speed={65} chargeLevel={55} isRouteTransitioning={false} />,
    );
    expect(screen.getByText('12 min')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Loading"]')).toBeNull();
  });
});
