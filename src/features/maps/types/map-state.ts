/**
 * @deprecated Use @/features/maps/core/map-snapshot.types
 */
export type { MapSnapshotCoords as MapLatLng, TrackingStage } from '@/features/maps/core/map-snapshot.types';

import type { TrackingStage } from '@/features/maps/core/map-snapshot.types';

export type MapState = {
  driverPosition: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  trail: { lat: number; lng: number }[];
  heading: number;
  gpsReady: boolean;
  mapReady: boolean;
  storeLocation: { lat: number; lng: number } | null;
  stage: TrackingStage;
};

export function mapRenderFlags() {
  return { showDriver: true, showTrail: true, showStore: true };
}

export function buildRenderableMapState(raw: MapState): MapState {
  return raw;
}
