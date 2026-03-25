/**
 * Vehicles feature — public API.
 * Only export what app/ pages and other features need.
 * Internal components (TripProgressBar, StatRow, etc.) are NOT exported.
 */

// Components
export { HomeScreen } from './components/HomeScreen';
export { HomeEmptyScreen } from './components/HomeEmptyScreen';
export { HomeSyncingScreen } from './components/HomeSyncingScreen';
export { SharedViewerScreen } from './components/SharedViewerScreen';

// Server actions
export { getVehicles, getCachedVehicles, syncVehicles, getVehicleById, generateWsToken } from './api/actions';
export { checkPairingStatus, checkVehicleConnection, updateSetupStatus } from './api/setup-actions';

// Types (used by app/ pages for data passing)
export type { VehicleWithTrip, SheetState } from './types';
