import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { RefreshButton } from '@/features/vehicles/components/RefreshButton';

describe('RefreshButton', () => {
  it('renders a button element', () => {
    render(<RefreshButton isRefreshing={false} onRefresh={() => {}} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('fires onRefresh when clicked', () => {
    const onRefresh = vi.fn();
    render(<RefreshButton isRefreshing={false} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('is disabled while refreshing', () => {
    render(<RefreshButton isRefreshing={true} onRefresh={() => {}} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is enabled when not refreshing', () => {
    render(<RefreshButton isRefreshing={false} onRefresh={() => {}} />);

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('does not fire onRefresh when clicked while disabled', () => {
    const onRefresh = vi.fn();
    render(<RefreshButton isRefreshing={true} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('applies animate-spin class to SVG while refreshing', () => {
    const { container } = render(
      <RefreshButton isRefreshing={true} onRefresh={() => {}} />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('class')).toContain('animate-spin');
  });

  it('does not apply animate-spin class when idle', () => {
    const { container } = render(
      <RefreshButton isRefreshing={false} onRefresh={() => {}} />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('class')).not.toContain('animate-spin');
  });

  it('has aria-label "Refresh vehicle data" when idle', () => {
    render(<RefreshButton isRefreshing={false} onRefresh={() => {}} />);

    expect(screen.getByLabelText('Refresh vehicle data')).toBeInTheDocument();
  });

  it('has aria-label "Refreshing vehicle data" while refreshing', () => {
    render(<RefreshButton isRefreshing={true} onRefresh={() => {}} />);

    expect(screen.getByLabelText('Refreshing vehicle data')).toBeInTheDocument();
  });

  it('hides the SVG icon from screen readers', () => {
    const { container } = render(
      <RefreshButton isRefreshing={false} onRefresh={() => {}} />,
    );

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});
