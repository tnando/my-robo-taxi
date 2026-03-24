import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { formatRelativeTime } from '@/features/vehicles/api/vehicle-mappers';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Anchor "now" to a known date: 2026-03-24T12:00:00Z
    vi.setSystemTime(new Date('2026-03-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for timestamps less than 60 seconds ago', () => {
    const tenSecondsAgo = new Date('2026-03-24T11:59:50Z').toISOString();
    expect(formatRelativeTime(tenSecondsAgo)).toBe('Just now');
  });

  it('returns "Just now" for timestamps exactly 0 seconds ago', () => {
    const now = new Date('2026-03-24T12:00:00Z').toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns "Just now" for timestamps 59 seconds ago', () => {
    const fiftyNineSecondsAgo = new Date('2026-03-24T11:59:01Z').toISOString();
    expect(formatRelativeTime(fiftyNineSecondsAgo)).toBe('Just now');
  });

  it('returns "1m ago" at exactly 60 seconds', () => {
    const sixtySecondsAgo = new Date('2026-03-24T11:59:00Z').toISOString();
    expect(formatRelativeTime(sixtySecondsAgo)).toBe('1m ago');
  });

  it('returns minutes for timestamps under 60 minutes ago', () => {
    const fiveMinutesAgo = new Date('2026-03-24T11:55:00Z').toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns "59m ago" at 59 minutes', () => {
    const fiftyNineMinutesAgo = new Date('2026-03-24T11:01:00Z').toISOString();
    expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe('59m ago');
  });

  it('returns "1h ago" at exactly 60 minutes', () => {
    const oneHourAgo = new Date('2026-03-24T11:00:00Z').toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');
  });

  it('returns hours for timestamps under 24 hours ago', () => {
    const threeHoursAgo = new Date('2026-03-24T09:00:00Z').toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns "23h ago" at 23 hours', () => {
    const twentyThreeHoursAgo = new Date('2026-03-23T13:00:00Z').toISOString();
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('returns "1d ago" at exactly 24 hours', () => {
    const oneDayAgo = new Date('2026-03-23T12:00:00Z').toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');
  });

  it('returns days for timestamps under 7 days ago', () => {
    const threeDaysAgo = new Date('2026-03-21T12:00:00Z').toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns "6d ago" at 6 days', () => {
    const sixDaysAgo = new Date('2026-03-18T12:00:00Z').toISOString();
    expect(formatRelativeTime(sixDaysAgo)).toBe('6d ago');
  });

  it('returns absolute date at exactly 7 days', () => {
    const sevenDaysAgo = new Date('2026-03-17T12:00:00Z').toISOString();
    expect(formatRelativeTime(sevenDaysAgo)).toBe('Mar 17');
  });

  it('returns absolute date for timestamps more than 7 days ago', () => {
    const twoWeeksAgo = new Date('2026-03-10T12:00:00Z').toISOString();
    expect(formatRelativeTime(twoWeeksAgo)).toBe('Mar 10');
  });

  it('returns "Unknown" for invalid ISO strings', () => {
    expect(formatRelativeTime('not-a-date')).toBe('Unknown');
    expect(formatRelativeTime('')).toBe('Unknown');
    expect(formatRelativeTime('abc123')).toBe('Unknown');
  });

  it('returns "Just now" for future timestamps (clamped to 0 diff)', () => {
    const future = new Date('2026-03-24T12:05:00Z').toISOString();
    expect(formatRelativeTime(future)).toBe('Just now');
  });

  it('formats dates from different months correctly', () => {
    const jan1 = new Date('2026-01-01T12:00:00Z').toISOString();
    expect(formatRelativeTime(jan1)).toBe('Jan 1');
  });
});
