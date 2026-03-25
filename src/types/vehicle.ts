/** Vehicle statuses that map to status colors in the design system. */
export type VehicleStatus = 'driving' | 'parked' | 'charging' | 'offline' | 'in_service';

/** Setup status tracking vehicle onboarding progress. */
export type SetupStatus =
  | 'pending_pairing'
  | 'pairing_detected'
  | 'config_pushed'
  | 'waiting_connection'
  | 'connected';

/** Valid gear positions from Tesla drive_state.shift_state. */
export type GearPosition = 'P' | 'R' | 'N' | 'D';

/** Set of valid gear position strings for runtime validation at data boundaries. */
export const VALID_GEARS = new Set<string>(['P', 'R', 'N', 'D']);

/** A stop along a vehicle's active trip route. */
export interface TripStop {
  name: string;
  address: string;
  type: 'charging' | 'waypoint';
}

/** Core vehicle entity with telemetry and optional active-trip data. */
export interface Vehicle {
  id: string;
  name: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  chargeLevel: number;
  estimatedRange: number;
  status: VehicleStatus;
  speed: number;
  gearPosition: GearPosition | null;
  heading: number;
  locationName: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  interiorTemp: number;
  exteriorTemp: number;
  lastUpdated: string;
  odometerMiles: number;
  fsdMilesToday: number;
  virtualKeyPaired: boolean;
  setupStatus: SetupStatus;
  /** VIN — available after Tesla sync. Needed for pairing checks and telemetry. */
  vin?: string;
  /** Active trip fields — present only when status === 'driving'. */
  destinationName?: string;
  destinationAddress?: string;
  etaMinutes?: number;
  tripDistanceMiles?: number;
  tripDistanceRemaining?: number;
  stops?: TripStop[];
}

/** Status display config for UI rendering. */
export interface StatusConfig {
  color: string;
  label: string;
  dotColor: string;
}

/** Map from vehicle status to display config. */
export type StatusConfigMap = Record<VehicleStatus, StatusConfig>;
