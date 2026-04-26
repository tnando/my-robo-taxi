-- MYR-41: Add chargeState + timeToFull columns to Vehicle.
--
-- Closes the REST `/snapshot` DB-persistence gap for the two charge-atomic-group
-- members wired live on WebSocket by MYR-40 (2026-04-22). Until this migration
-- deploys, live `vehicle_update` WS frames carry both fields but the REST
-- snapshot returns null because the columns don't exist.
--
-- Both columns are nullable (a vehicle that has never charged has no charge
-- state to record). The Go server (telemetry repo) maps Tesla proto field 179
-- DetailedChargeState -> chargeState (enum string) and proto field 43
-- TimeToFullCharge -> timeToFull (double, hours).
--
-- Deploy ordering: this migration MUST run against production BEFORE the
-- companion telemetry-server PR deploys with the new SELECT/UPDATE columns.
-- See websocket-protocol.md §10 DV-03 + DV-04 for the contract context.

ALTER TABLE "Vehicle" ADD COLUMN     "chargeState" TEXT,
ADD COLUMN     "timeToFull" DOUBLE PRECISION;
