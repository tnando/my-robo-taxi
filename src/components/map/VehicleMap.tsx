'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import type { LngLat } from '@/types/drive';
import { MAPBOX_DEFAULT_CENTER, MAPBOX_DEFAULT_ZOOM, MAPBOX_GOLD } from '@/lib/mapbox';

import { useMapInstance } from './hooks/use-map-instance';
import { useVehicleMarker } from './hooks/use-vehicle-marker';
import { useRouteLayer } from './hooks/use-route-layer';

/** Props for the VehicleMap component. */
export interface VehicleMapProps {
  /** Show the pulsing gold vehicle marker. */
  showVehicleMarker?: boolean;
  /** Show the two-tone route line. */
  showRoute?: boolean;
  /** Route coordinates as [lng, lat] pairs. */
  routeCoordinates?: LngLat[];
  /** Current vehicle position [lng, lat]. */
  vehiclePosition?: LngLat;
  /** Vehicle heading in degrees (0=North). */
  heading?: number;
  /** Map center [lng, lat]. */
  center?: LngLat;
  /** Map zoom level. */
  zoom?: number;
  /** Whether map is interactive (pan/zoom). */
  interactive?: boolean;
  /** Bottom offset for the fit-to-route button (pixels). Defaults to 310. */
  fitButtonBottom?: number;
  /** Children rendered as overlays on the map. */
  children?: React.ReactNode;
}

/**
 * Full-screen Mapbox GL JS map with vehicle marker, route rendering, and overlays.
 * Must be dynamically imported with `ssr: false` — Mapbox depends on `window`.
 *
 * Composed from focused hooks:
 * - useMapInstance: map creation + lifecycle
 * - useVehicleMarker: gold pulsing marker + heading rotation
 * - useRouteLayer: two-tone route + start/end markers + fitBounds
 */
export function VehicleMap({
  showVehicleMarker = true,
  showRoute = false,
  routeCoordinates,
  vehiclePosition,
  heading = 0,
  center = MAPBOX_DEFAULT_CENTER,
  zoom = MAPBOX_DEFAULT_ZOOM,
  fitButtonBottom = 310,
  interactive = true,
  children,
}: VehicleMapProps) {
  const { mapContainer, map, mapLoaded } = useMapInstance(center, zoom, interactive);

  const markerPos = vehiclePosition ?? center;
  useVehicleMarker(map, mapLoaded, showVehicleMarker, markerPos, heading);

  const { fitToRoute } = useRouteLayer(
    map, mapLoaded, showRoute, routeCoordinates, markerPos,
  );

  const showFitButton = showRoute && routeCoordinates && routeCoordinates.length >= 2;

  return (
    <div className="absolute inset-0" role="img" aria-label="Vehicle map">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" aria-hidden="true" />

      {showFitButton && <FitRouteButton onClick={fitToRoute} bottom={fitButtonBottom} />}

      {children}
    </div>
  );
}

/** Fit-to-route floating button. */
function FitRouteButton({ onClick, bottom }: { onClick: () => void; bottom: number }) {
  return (
    <button
      onClick={onClick}
      className="absolute z-30 w-10 h-10 rounded-[10px] flex items-center justify-center cursor-pointer"
      style={{
        bottom,
        right: 16,
        background: 'rgba(30,30,30,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
      aria-label="Zoom to fit route"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 7V3H7" stroke={MAPBOX_GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 3H17V7" stroke={MAPBOX_GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 13V17H13" stroke={MAPBOX_GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 17H3V13" stroke={MAPBOX_GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
