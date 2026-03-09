/**
 * Pure mapping functions from Tesla Fleet API responses to Prisma Vehicle data.
 * No side effects, no database access, no React.
 */

import type { VehicleStatus } from '@/types/vehicle';
import type { TeslaVehicleListItem, TeslaVehicleData } from '@/lib/tesla-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeslaVehicleUpsertData {
  teslaVehicleId: string;
  vin: string;
  name: string;
  model: string;
  year: number;
  chargeLevel: number;
  estimatedRange: number;
  status: VehicleStatus;
  speed: number;
  heading: number;
  latitude: number;
  longitude: number;
  interiorTemp: number;
  exteriorTemp: number;
  odometerMiles: number;
}

// ─── Status mapping ──────────────────────────────────────────────────────────

export function mapTeslaStateToVehicleStatus(
  vehicleState: string,
  chargingState: string | null,
  speed: number | null,
  inService?: boolean,
  shiftState?: string | null,
): VehicleStatus {
  if (vehicleState === 'offline' || vehicleState === 'asleep') {
    return 'offline';
  }
  if (inService || vehicleState === 'in_service') {
    return 'in_service';
  }
  if (chargingState === 'Charging') {
    return 'charging';
  }
  if ((speed != null && speed > 0) || shiftState === 'D' || shiftState === 'R') {
    return 'driving';
  }
  return 'parked';
}

// ─── Temperature ─────────────────────────────────────────────────────────────

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round(celsius * 9 / 5 + 32);
}

// ─── VIN parsing ─────────────────────────────────────────────────────────────

const MODEL_CHAR_MAP: Record<string, string> = {
  S: 'Model S',
  '3': 'Model 3',
  X: 'Model X',
  Y: 'Model Y',
  C: 'Cybertruck',
};

const YEAR_CHAR_MAP: Record<string, number> = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015,
  G: 2016, H: 2017, J: 2018, K: 2019, L: 2020, M: 2021,
  N: 2022, P: 2023, R: 2024, S: 2025, T: 2026,
};

export function parseModelFromVin(vin: string): { model: string; year: number } {
  const modelChar = vin.charAt(3);
  const yearChar = vin.charAt(9);

  const model = MODEL_CHAR_MAP[modelChar] ?? `Tesla (${modelChar})`;
  const year = YEAR_CHAR_MAP[yearChar] ?? 2024;

  return { model, year };
}

// ─── Full mapping ────────────────────────────────────────────────────────────

export function mapTeslaVehicleToUpsertData(
  listItem: TeslaVehicleListItem,
  vehicleData: TeslaVehicleData,
): TeslaVehicleUpsertData {
  const drive_state = vehicleData.drive_state ?? {
    latitude: null, longitude: null, heading: null, speed: null, shift_state: null,
  };
  const charge_state = vehicleData.charge_state ?? {
    battery_level: null, battery_range: null, charging_state: null,
  };
  const vehicle_state = vehicleData.vehicle_state ?? {
    odometer: null, vehicle_name: null,
  };
  const climate_state = vehicleData.climate_state ?? {
    inside_temp: null, outside_temp: null,
  };
  const { model, year } = parseModelFromVin(vehicleData.vin);

  // Latitude/longitude may be null when the vehicle is asleep/offline.
  // Use null to signal "no update" so the sync layer can preserve the last known position.
  const latitude = drive_state.latitude ?? null;
  const longitude = drive_state.longitude ?? null;

  return {
    teslaVehicleId: String(listItem.id),
    vin: vehicleData.vin,
    name: vehicle_state.vehicle_name || listItem.display_name || vehicleData.display_name || 'My Tesla',
    model,
    year,
    chargeLevel: charge_state.battery_level ?? 0,
    estimatedRange: Math.round(charge_state.battery_range ?? 0),
    status: mapTeslaStateToVehicleStatus(
      vehicleData.state,
      charge_state.charging_state ?? null,
      drive_state.speed ?? null,
      vehicleData.in_service,
      drive_state.shift_state,
    ),
    speed: drive_state.speed ?? 0,
    heading: drive_state.heading ?? 0,
    latitude: latitude ?? 0,
    longitude: longitude ?? 0,
    interiorTemp: celsiusToFahrenheit(climate_state.inside_temp ?? 20),
    exteriorTemp: celsiusToFahrenheit(climate_state.outside_temp ?? 20),
    odometerMiles: Math.round(vehicle_state.odometer ?? 0),
  };
}
