import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { GearIndicator, resolveGear } from '@/features/vehicles/components/GearIndicator';

describe('resolveGear', () => {
  it('returns D when gearPosition is D', () => {
    expect(resolveGear('D', 'driving')).toBe('D');
  });

  it('returns R when gearPosition is R', () => {
    expect(resolveGear('R', 'driving')).toBe('R');
  });

  it('returns N when gearPosition is N', () => {
    expect(resolveGear('N', 'parked')).toBe('N');
  });

  it('returns P when gearPosition is P', () => {
    expect(resolveGear('P', 'parked')).toBe('P');
  });

  it('infers P when gearPosition is null and status is parked', () => {
    expect(resolveGear(null, 'parked')).toBe('P');
  });

  it('infers P when gearPosition is null and status is charging', () => {
    expect(resolveGear(null, 'charging')).toBe('P');
  });

  it('infers P when gearPosition is null and status is offline', () => {
    expect(resolveGear(null, 'offline')).toBe('P');
  });

  it('infers D when gearPosition is null and status is driving', () => {
    expect(resolveGear(null, 'driving')).toBe('D');
  });

  it('infers P for unknown gearPosition string', () => {
    expect(resolveGear('X', 'parked')).toBe('P');
  });
});

describe('GearIndicator', () => {
  it('renders all four gear labels', () => {
    render(<GearIndicator gearPosition="P" status="parked" />);
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('highlights D when driving in Drive', () => {
    render(<GearIndicator gearPosition="D" status="driving" />);
    const dLabel = screen.getByText('D');
    expect(dLabel.style.color).toBe('#30D158');
  });

  it('highlights P when parked with null gear', () => {
    render(<GearIndicator gearPosition={null} status="parked" />);
    const pLabel = screen.getByText('P');
    expect(pLabel.style.color).toBe('#3B82F6');
  });

  it('highlights R when gear is R', () => {
    render(<GearIndicator gearPosition="R" status="driving" />);
    const rLabel = screen.getByText('R');
    expect(rLabel.style.color).toBe('#FF9F0A');
  });

  it('does not apply inline color to inactive gears', () => {
    render(<GearIndicator gearPosition="D" status="driving" />);
    const pLabel = screen.getByText('P');
    expect(pLabel.style.color).toBe('');
  });

  it('sets aria-label with the active gear', () => {
    render(<GearIndicator gearPosition="D" status="driving" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Gear: D');
  });

  it('marks active gear with aria-current', () => {
    render(<GearIndicator gearPosition="N" status="parked" />);
    const nLabel = screen.getByText('N');
    expect(nLabel).toHaveAttribute('aria-current', 'true');
  });
});
