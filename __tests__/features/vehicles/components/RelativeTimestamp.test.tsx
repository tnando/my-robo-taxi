import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { RelativeTimestamp } from '@/features/vehicles/components/RelativeTimestamp';

// Mock the useRelativeTime hook to control its output
vi.mock('@/features/vehicles/hooks/use-relative-time', () => ({
  useRelativeTime: vi.fn(),
}));

import { useRelativeTime } from '@/features/vehicles/hooks/use-relative-time';
const mockUseRelativeTime = vi.mocked(useRelativeTime);

describe('RelativeTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the relative time text from the hook', () => {
    mockUseRelativeTime.mockReturnValue({ text: '3m ago', isFresh: true });

    render(<RelativeTimestamp isoString="2026-03-24T11:57:00Z" />);

    expect(screen.getByText(/3m ago/)).toBeInTheDocument();
  });

  it('prefixes the time text with "Updated"', () => {
    mockUseRelativeTime.mockReturnValue({ text: 'Just now', isFresh: true });

    render(<RelativeTimestamp isoString="2026-03-24T12:00:00Z" />);

    expect(screen.getByText('Updated Just now')).toBeInTheDocument();
  });

  it('renders a green dot when data is fresh', () => {
    mockUseRelativeTime.mockReturnValue({ text: '2m ago', isFresh: true });

    const { container } = render(
      <RelativeTimestamp isoString="2026-03-24T11:58:00Z" />,
    );

    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeTruthy();
    expect(dot?.className).toContain('bg-green-500');
  });

  it('renders a muted dot when data is stale', () => {
    mockUseRelativeTime.mockReturnValue({ text: '10m ago', isFresh: false });

    const { container } = render(
      <RelativeTimestamp isoString="2026-03-24T11:50:00Z" />,
    );

    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeTruthy();
    expect(dot?.className).toContain('bg-text-muted/40');
    expect(dot?.className).not.toContain('bg-green-500');
  });

  it('shows absolute time in the title attribute', () => {
    mockUseRelativeTime.mockReturnValue({ text: '2m ago', isFresh: true });

    // 2026-03-24T12:00:00Z — in local time this is deterministic via formatAbsoluteTime
    // The function uses local Date methods, so the expected value depends on the test
    // environment's timezone. We just verify the title attribute is set and not "Unknown".
    render(<RelativeTimestamp isoString="2026-03-24T12:00:00Z" />);

    const paragraph = screen.getByText(/Updated/);
    const title = paragraph.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).not.toBe('Unknown');
    // Should match the pattern: "Mon DD, H:MM AM/PM"
    expect(title).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/);
  });

  it('shows "Unknown" in title for invalid timestamps', () => {
    mockUseRelativeTime.mockReturnValue({ text: 'Unknown', isFresh: false });

    render(<RelativeTimestamp isoString="not-a-date" />);

    const paragraph = screen.getByText(/Updated/);
    expect(paragraph.getAttribute('title')).toBe('Unknown');
  });

  it('passes the isoString to useRelativeTime', () => {
    mockUseRelativeTime.mockReturnValue({ text: '5m ago', isFresh: true });

    render(<RelativeTimestamp isoString="2026-03-24T11:55:00Z" />);

    expect(mockUseRelativeTime).toHaveBeenCalledWith('2026-03-24T11:55:00Z');
  });

  it('hides the dot from screen readers', () => {
    mockUseRelativeTime.mockReturnValue({ text: '1m ago', isFresh: true });

    const { container } = render(
      <RelativeTimestamp isoString="2026-03-24T11:59:00Z" />,
    );

    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeTruthy();
  });
});
