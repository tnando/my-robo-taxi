import { describe, it, expect } from 'vitest';

import {
  mapTeslaStateToVehicleStatus,
  celsiusToFahrenheit,
  parseModelFromVin,
  mapTeslaVehicleToUpsertData,
} from '@/lib/tesla-mapper';
import type { TeslaVehicleListItem, TeslaVehicleData } from '@/lib/tesla-client';

// ─── mapTeslaStateToVehicleStatus ────────────────────────────────────────────

describe('mapTeslaStateToVehicleStatus', () => {
  it('returns offline for "offline" state', () => {
    expect(mapTeslaStateToVehicleStatus('offline', null, null)).toBe('offline');
  });

  it('returns offline for "asleep" state', () => {
    expect(mapTeslaStateToVehicleStatus('asleep', null, null)).toBe('offline');
  });

  it('returns charging when charging_state is "Charging"', () => {
    expect(mapTeslaStateToVehicleStatus('online', 'Charging', 0)).toBe('charging');
  });

  it('returns driving when speed > 0', () => {
    expect(mapTeslaStateToVehicleStatus('online', 'Disconnected', 65)).toBe('driving');
  });

  it('returns parked when online, not charging, speed is 0', () => {
    expect(mapTeslaStateToVehicleStatus('online', 'Disconnected', 0)).toBe('parked');
  });

  it('returns parked when speed is null', () => {
    expect(mapTeslaStateToVehicleStatus('online', null, null)).toBe('parked');
  });

  it('prioritizes offline over charging', () => {
    expect(mapTeslaStateToVehicleStatus('offline', 'Charging', 0)).toBe('offline');
  });

  it('prioritizes charging over driving', () => {
    expect(mapTeslaStateToVehicleStatus('online', 'Charging', 30)).toBe('charging');
  });
});

// ─── celsiusToFahrenheit ─────────────────────────────────────────────────────

describe('celsiusToFahrenheit', () => {
  it('converts 0°C to 32°F', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
  });

  it('converts 100°C to 212°F', () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  it('converts 22°C to 72°F', () => {
    expect(celsiusToFahrenheit(22)).toBe(72);
  });

  it('rounds to nearest integer', () => {
    expect(celsiusToFahrenheit(22.5)).toBe(73);
  });

  it('handles negative temperatures', () => {
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });
});

// ─── parseModelFromVin ───────────────────────────────────────────────────────

describe('parseModelFromVin', () => {
  it('parses Model Y from VIN', () => {
    const result = parseModelFromVin('5YJ3E1EA1NF000001');
    // char 3 = '3' → Model 3, char 9 = 'N' → 2022
    expect(result.model).toBe('Model 3');
    expect(result.year).toBe(2022);
  });

  it('parses Model Y from VIN with Y at position 3', () => {
    const result = parseModelFromVin('5YJYE1EA1SF000001');
    expect(result.model).toBe('Model Y');
    expect(result.year).toBe(2025);
  });

  it('parses Cybertruck from VIN', () => {
    const result = parseModelFromVin('7SACEA1EATF000001');
    // char 3 = 'C' → Cybertruck, char 9 = 'T' → 2026
    expect(result.model).toBe('Cybertruck');
    expect(result.year).toBe(2026);
  });

  it('returns fallback for unknown model char', () => {
    const result = parseModelFromVin('5YJZ11EA1NF000001');
    expect(result.model).toBe('Tesla (Z)');
  });

  it('returns fallback year for unknown year char', () => {
    const result = parseModelFromVin('5YJ311EA10F000001');
    expect(result.year).toBe(2024);
  });
});

// ─── mapTeslaVehicleToUpsertData ─────────────────────────────────────────────

describe('mapTeslaVehicleToUpsertData', () => {
  const listItem: TeslaVehicleListItem = {
    id: 12345,
    vehicle_id: 67890,
    vin: '5YJYE1EA1SF000001',
    display_name: 'My Tesla',
    state: 'online',
  };

  const vehicleData: TeslaVehicleData = {
    id: 12345,
    vehicle_id: 67890,
    vin: '5YJYE1EA1SF000001',
    display_name: 'My Tesla',
    state: 'online',
    drive_state: {
      latitude: 30.325,
      longitude: -97.738,
      heading: 280,
      speed: 65,
    },
    charge_state: {
      battery_level: 78,
      battery_range: 245.5,
      charging_state: 'Disconnected',
    },
    vehicle_state: {
      odometer: 12847.3,
      vehicle_name: 'My Tesla',
    },
    climate_state: {
      inside_temp: 22.2,
      outside_temp: 31.1,
    },
  };

  it('maps full vehicle data correctly', () => {
    const result = mapTeslaVehicleToUpsertData(listItem, vehicleData);

    expect(result.teslaVehicleId).toBe('12345');
    expect(result.vin).toBe('5YJYE1EA1SF000001');
    expect(result.name).toBe('My Tesla');
    expect(result.model).toBe('Model Y');
    expect(result.year).toBe(2025);
    expect(result.chargeLevel).toBe(78);
    expect(result.estimatedRange).toBe(246);
    expect(result.status).toBe('driving');
    expect(result.speed).toBe(65);
    expect(result.heading).toBe(280);
    expect(result.latitude).toBe(30.325);
    expect(result.longitude).toBe(-97.738);
    expect(result.odometerMiles).toBe(12847);
  });

  it('converts temperatures from Celsius to Fahrenheit', () => {
    const result = mapTeslaVehicleToUpsertData(listItem, vehicleData);

    expect(result.interiorTemp).toBe(celsiusToFahrenheit(22.2));
    expect(result.exteriorTemp).toBe(celsiusToFahrenheit(31.1));
  });

  it('defaults null speed to 0', () => {
    const parkedData: TeslaVehicleData = {
      ...vehicleData,
      drive_state: { ...vehicleData.drive_state, speed: null },
    };

    const result = mapTeslaVehicleToUpsertData(listItem, parkedData);
    expect(result.speed).toBe(0);
  });

  it('uses fallback name when display_name is null', () => {
    const noNameItem: TeslaVehicleListItem = { ...listItem, display_name: null };
    const noNameData: TeslaVehicleData = {
      ...vehicleData,
      display_name: null,
      vehicle_state: { ...vehicleData.vehicle_state, vehicle_name: null },
    };

    const result = mapTeslaVehicleToUpsertData(noNameItem, noNameData);
    expect(result.name).toBe('My Tesla');
  });

  it('defaults null values to 0', () => {
    const nullData: TeslaVehicleData = {
      ...vehicleData,
      drive_state: { latitude: null, longitude: null, heading: null, speed: null },
      charge_state: { battery_level: null, battery_range: null, charging_state: null },
      vehicle_state: { odometer: null, vehicle_name: null },
      climate_state: { inside_temp: null, outside_temp: null },
    };

    const result = mapTeslaVehicleToUpsertData(listItem, nullData);
    expect(result.chargeLevel).toBe(0);
    expect(result.estimatedRange).toBe(0);
    expect(result.speed).toBe(0);
    expect(result.heading).toBe(0);
    expect(result.latitude).toBe(0);
    expect(result.longitude).toBe(0);
    expect(result.odometerMiles).toBe(0);
  });
});
