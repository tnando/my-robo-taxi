import { describe, it, expect } from 'vitest';
import {
  formatDateLabel,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatBatteryLevel,
  formatEta,
  formatTemperature,
  formatOdometer,
  formatEnergy,
  formatTime,
  formatLocation,
} from '@/lib/format';

/** Returns local date as YYYY-MM-DD (not UTC). */
function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('formatDateLabel', () => {
  it('returns "Today" for today\'s date', () => {
    const iso = toLocalISO(new Date());
    expect(formatDateLabel(iso)).toBe('Today');
  });

  it('returns "Yesterday" for yesterday\'s date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = toLocalISO(yesterday);
    expect(formatDateLabel(iso)).toBe('Yesterday');
  });

  it('returns a formatted date for older dates', () => {
    const result = formatDateLabel('2026-01-15');
    // Should contain the day name and date
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });
});

describe('formatDuration', () => {
  it('formats minutes under 60 as Xm', () => {
    expect(formatDuration(35)).toBe('35m');
  });

  it('formats exactly 60 minutes as 1h', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('formats hours and minutes as Xh Ym', () => {
    expect(formatDuration(75)).toBe('1h 15m');
  });

  it('rounds fractional minutes', () => {
    expect(formatDuration(30.7)).toBe('31m');
  });

  it('formats zero minutes', () => {
    expect(formatDuration(0)).toBe('0m');
  });
});

describe('formatDistance', () => {
  it('formats with one decimal place', () => {
    expect(formatDistance(14.2)).toBe('14.2 mi');
  });

  it('adds .0 for whole numbers', () => {
    expect(formatDistance(5)).toBe('5.0 mi');
  });
});

describe('formatSpeed', () => {
  it('formats speed and rounds', () => {
    expect(formatSpeed(65)).toBe('65 mph');
    expect(formatSpeed(65.7)).toBe('66 mph');
  });
});

describe('formatBatteryLevel', () => {
  it('formats as percentage', () => {
    expect(formatBatteryLevel(78)).toBe('78%');
  });

  it('rounds fractional values', () => {
    expect(formatBatteryLevel(42.3)).toBe('42%');
  });
});

describe('formatEta', () => {
  it('formats as minutes', () => {
    expect(formatEta(23)).toBe('23 min');
  });
});

describe('formatTemperature', () => {
  it('formats with degree symbol and F', () => {
    expect(formatTemperature(72)).toBe('72°F');
  });

  it('rounds fractional values', () => {
    expect(formatTemperature(72.6)).toBe('73°F');
  });
});

describe('formatOdometer', () => {
  it('formats with thousands separators', () => {
    expect(formatOdometer(12847)).toBe('12,847 mi');
  });

  it('formats small numbers without separator', () => {
    expect(formatOdometer(500)).toBe('500 mi');
  });
});

describe('formatEnergy', () => {
  it('formats with one decimal and kWh unit', () => {
    expect(formatEnergy(4.8)).toBe('4.8 kWh');
  });

  it('adds .0 for whole numbers', () => {
    expect(formatEnergy(3)).toBe('3.0 kWh');
  });
});

describe('formatTime', () => {
  it('formats an ISO timestamp to local time', () => {
    // Use a fixed ISO string — the result depends on locale/timezone
    const result = formatTime('2026-03-16T21:07:56.573Z');
    // Should contain a colon and AM/PM indicator
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
  });

  it('returns empty string for empty input', () => {
    expect(formatTime('')).toBe('');
  });

  it('returns already-formatted time as-is', () => {
    expect(formatTime('4:07 PM')).toBe('4:07 PM');
  });

  it('returns non-ISO strings as-is', () => {
    expect(formatTime('2:15 PM')).toBe('2:15 PM');
  });

  it('handles invalid ISO strings gracefully', () => {
    expect(formatTime('not-a-date')).toBe('not-a-date');
  });
});

describe('formatLocation', () => {
  it('returns place names as-is', () => {
    expect(formatLocation('Thompson Hotel')).toBe('Thompson Hotel');
  });

  it('formats coordinate strings', () => {
    expect(formatLocation('30.3250,-97.7380')).toBe('30.3250, -97.7380');
  });

  it('returns "Unknown" for empty input', () => {
    expect(formatLocation('')).toBe('Unknown');
  });

  it('returns addresses with commas as-is', () => {
    // Addresses have more than 2 comma-separated parts
    expect(formatLocation('506 San Jacinto Blvd, Austin, TX')).toBe(
      '506 San Jacinto Blvd, Austin, TX',
    );
  });

  it('handles two-word place names without treating as coordinates', () => {
    expect(formatLocation('Domain Northside')).toBe('Domain Northside');
  });
});
