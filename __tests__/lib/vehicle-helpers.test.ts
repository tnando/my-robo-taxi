import { describe, it, expect } from 'vitest';
import {
  STATUS_CONFIG,
  getStatusMessage,
  getBatteryColor,
  getBatteryTextColor,
  isDriving,
} from '@/lib/vehicle-helpers';
import type { Vehicle } from '@/types/vehicle';

/** Factory for creating test vehicles with overrides. */
function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    name: 'Test Car',
    model: 'Model Y',
    year: 2024,
    color: 'White',
    licensePlate: 'TEST-001',
    chargeLevel: 78,
    estimatedRange: 245,
    status: 'parked',
    speed: 0,
    gearPosition: null,
    heading: 0,
    locationName: 'Home',
    locationAddress: '123 Main St',
    latitude: 30.2672,
    longitude: -97.7431,
    interiorTemp: 72,
    exteriorTemp: 88,
    lastUpdated: '3s ago',
    odometerMiles: 12000,
    fsdMilesToday: 10,
    virtualKeyPaired: true,
    ...overrides,
  };
}

describe('STATUS_CONFIG', () => {
  it('has all five status keys', () => {
    expect(STATUS_CONFIG).toHaveProperty('driving');
    expect(STATUS_CONFIG).toHaveProperty('parked');
    expect(STATUS_CONFIG).toHaveProperty('charging');
    expect(STATUS_CONFIG).toHaveProperty('offline');
    expect(STATUS_CONFIG).toHaveProperty('in_service');
  });

  it('each config has color, label, and dotColor', () => {
    Object.values(STATUS_CONFIG).forEach((config) => {
      expect(config.color).toBeDefined();
      expect(config.label).toBeDefined();
      expect(config.dotColor).toBeDefined();
    });
  });
});

describe('getStatusMessage', () => {
  it('returns driving message with speed and location', () => {
    const v = makeVehicle({ status: 'driving', speed: 65, locationName: 'I-35 North' });
    expect(getStatusMessage(v)).toBe('Driving — 65 mph on I-35 North');
  });

  it('returns parked message with location', () => {
    const v = makeVehicle({ status: 'parked', locationName: 'Home' });
    expect(getStatusMessage(v)).toBe('Parked at Home');
  });

  it('returns charging message with location and level', () => {
    const v = makeVehicle({ status: 'charging', locationName: 'Supercharger', chargeLevel: 42 });
    expect(getStatusMessage(v)).toBe('Charging at Supercharger — 42%');
  });

  it('returns offline message with last location', () => {
    const v = makeVehicle({ status: 'offline', locationName: 'Garage' });
    expect(getStatusMessage(v)).toBe('Offline — Last seen at Garage');
  });

  it('returns in_service message with location', () => {
    const v = makeVehicle({ status: 'in_service', locationName: 'Tesla Service Center' });
    expect(getStatusMessage(v)).toBe('In Service at Tesla Service Center');
  });

  it('returns reversing message when gear is R', () => {
    const v = makeVehicle({ status: 'driving', speed: 5, locationName: 'Driveway', gearPosition: 'R' });
    expect(getStatusMessage(v)).toBe('Reversing — 5 mph at Driveway');
  });

  it('returns driving message when gear is D', () => {
    const v = makeVehicle({ status: 'driving', speed: 65, locationName: 'I-35 North', gearPosition: 'D' });
    expect(getStatusMessage(v)).toBe('Driving — 65 mph on I-35 North');
  });
});

describe('getBatteryColor', () => {
  it('returns green for levels above 50', () => {
    expect(getBatteryColor(78)).toBe('bg-battery-high');
    expect(getBatteryColor(100)).toBe('bg-battery-high');
    expect(getBatteryColor(51)).toBe('bg-battery-high');
  });

  it('returns yellow for levels 21-50', () => {
    expect(getBatteryColor(50)).toBe('bg-battery-mid');
    expect(getBatteryColor(21)).toBe('bg-battery-mid');
    expect(getBatteryColor(35)).toBe('bg-battery-mid');
  });

  it('returns red for levels 20 and below', () => {
    expect(getBatteryColor(20)).toBe('bg-battery-low');
    expect(getBatteryColor(5)).toBe('bg-battery-low');
    expect(getBatteryColor(0)).toBe('bg-battery-low');
  });
});

describe('getBatteryTextColor', () => {
  it('returns text-battery-high for levels above 50', () => {
    expect(getBatteryTextColor(78)).toBe('text-battery-high');
  });

  it('returns text-battery-mid for levels 21-50', () => {
    expect(getBatteryTextColor(35)).toBe('text-battery-mid');
  });

  it('returns text-battery-low for levels 20 and below', () => {
    expect(getBatteryTextColor(15)).toBe('text-battery-low');
  });
});

describe('isDriving', () => {
  it('returns true for driving status', () => {
    expect(isDriving('driving')).toBe(true);
  });

  it('returns false for non-driving statuses', () => {
    expect(isDriving('parked')).toBe(false);
    expect(isDriving('charging')).toBe(false);
    expect(isDriving('offline')).toBe(false);
    expect(isDriving('in_service')).toBe(false);
  });
});
