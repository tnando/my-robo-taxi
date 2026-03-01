/**
 * App-wide layout constants and configuration values.
 * No React code — importable from both server and client contexts.
 */

/** Bottom sheet peek height in pixels. */
export const SHEET_PEEK_HEIGHT = 260;

/** Bottom sheet half-state height as a fraction of viewport height. */
export const SHEET_HALF_FRACTION = 0.5;

/** Shared viewer bottom sheet peek height in pixels (no BottomNav overlap). */
export const SHARED_SHEET_PEEK_HEIGHT = 200;

/** Shared viewer bottom sheet half height in pixels. */
export const SHARED_SHEET_HALF_HEIGHT = 340;

/** Sheet height transition duration (seconds). */
export const SHEET_TRANSITION_DURATION = 0.3;

/** Sheet transition easing function. */
export const SHEET_TRANSITION_EASING = 'ease-out';

/** WebSocket reconnection config. */
export const WS_RECONNECT_BASE_DELAY = 1_000;
export const WS_RECONNECT_MAX_DELAY = 30_000;
export const WS_RECONNECT_MULTIPLIER = 2;
export const WS_RECONNECT_JITTER_FACTOR = 0.1;

/** Fallback polling interval when WebSocket is unavailable (ms). */
export const FALLBACK_POLL_INTERVAL = 10_000;

/** Routes where the bottom nav is hidden. */
export const HIDDEN_NAV_ROUTES = ['/signin', '/signup', '/empty', '/shared'];
