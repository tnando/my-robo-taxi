import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders the driving label', () => {
    render(<StatusBadge status="driving" />);
    expect(screen.getByText('Driving')).toBeInTheDocument();
  });

  it('renders the parked label', () => {
    render(<StatusBadge status="parked" />);
    expect(screen.getByText('Parked')).toBeInTheDocument();
  });

  it('renders the charging label', () => {
    render(<StatusBadge status="charging" />);
    expect(screen.getByText('Charging')).toBeInTheDocument();
  });

  it('renders the offline label', () => {
    render(<StatusBadge status="offline" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('applies the correct status color to the label', () => {
    const { container } = render(<StatusBadge status="driving" />);
    const labelSpan = container.querySelectorAll('span')[2]; // outer > dot, label
    const color = labelSpan.style.color;
    // happy-dom keeps hex, jsdom normalizes to rgb()
    expect(color === '#30D158' || color === 'rgb(48, 209, 88)').toBe(true);
  });

  it('renders a colored dot indicator', () => {
    const { container } = render(<StatusBadge status="parked" />);
    const dot = container.querySelector('.w-2.h-2.rounded-full');
    expect(dot).toBeTruthy();
    const style = dot?.getAttribute('style') ?? '';
    expect(style).toContain('background-color');
    // happy-dom keeps hex, jsdom normalizes to rgb()
    expect(style.includes('#3B82F6') || style.includes('rgb(59, 130, 246)')).toBe(true);
  });
});
