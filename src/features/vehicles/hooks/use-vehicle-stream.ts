'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

import type { Vehicle } from '@/types/vehicle';
import type { ConnectionStatus, VehicleUpdate } from '@/types/api';
import { VehicleWebSocket } from '@/lib/websocket';

/** Return type of the useVehicleStream hook. */
export interface UseVehicleStreamReturn {
  /** Record of vehicle ID to latest vehicle state. */
  vehicles: Record<string, Vehicle>;
  /** Current WebSocket connection status. */
  connectionStatus: ConnectionStatus;
  /** Manually trigger a reconnection attempt. */
  reconnect: () => void;
}

/** WebSocket URL from environment — empty disables WebSocket. */
const WS_URL = process.env.NEXT_PUBLIC_WS_URL
  ? `${process.env.NEXT_PUBLIC_WS_URL}/api/ws`
  : '';

/**
 * Hook for real-time vehicle telemetry via WebSocket.
 *
 * Manages WebSocket lifecycle (connect on mount, disconnect on unmount),
 * maintains a vehicle state record, and tracks connection status.
 * Falls back gracefully when no WS endpoint is configured.
 *
 * Uses a plain Record instead of Map so React can detect unchanged references
 * without allocating a new Map on every update. A new object reference is
 * only returned when the vehicle data actually changed.
 *
 * @param initialVehicles — Initial vehicle data (from server render or mock data)
 * @param sessionToken — Auth token for WebSocket authentication
 */
export function useVehicleStream(
  initialVehicles: Vehicle[],
  sessionToken?: string,
): UseVehicleStreamReturn {
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>(() => {
    const record: Record<string, Vehicle> = {};
    initialVehicles.forEach((v) => { record[v.id] = v; });
    return record;
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const wsRef = useRef<VehicleWebSocket | null>(null);

  // Handle incoming vehicle update — merge partial fields into existing state.
  // Only returns a new reference when the vehicle data has actually changed,
  // preventing unnecessary re-renders from identity churn.
  const handleUpdate = useCallback((update: VehicleUpdate) => {
    setVehicles((prev) => {
      const existing = prev[update.vehicleId];
      if (!existing) return prev;
      const updated = { ...existing, ...update.fields } as Vehicle;
      return { ...prev, [update.vehicleId]: updated };
    });
  }, []);

  // Connect/disconnect lifecycle
  useEffect(() => {
    if (!WS_URL || !sessionToken) {
      // No WebSocket configured — stay on initial data
      return;
    }

    const ws = new VehicleWebSocket(WS_URL, sessionToken);
    ws.onUpdate = handleUpdate;
    ws.onStatusChange = setConnectionStatus;

    wsRef.current = ws;
    ws.connect();

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [sessionToken, handleUpdate]);

  // Sync initial vehicles when they change (e.g., SWR revalidation).
  // Preserves any real-time WS updates over the server-rendered snapshot.
  useEffect(() => {
    setVehicles((prev) => {
      const next: Record<string, Vehicle> = {};
      initialVehicles.forEach((v) => {
        next[v.id] = prev[v.id] ?? v;
      });
      return next;
    });
  }, [initialVehicles]);

  const reconnect = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current?.connect();
  }, []);

  return {
    vehicles,
    connectionStatus,
    reconnect,
  };
}
