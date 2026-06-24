/**
 * MapSnapshot — single source of truth for live tracking map rendering.
 */

export type MapStage = 'idle' | 'assigned' | 'picked_up' | 'in_transit' | 'arrived' | 'delivered';

export type MapSnapshotCoords = {
  lat: number | null;
  lng: number | null;
};

export type MapCameraIntent = {
  /** One-shot fit bounds for assigned stage (store + destination). */
  assignedFitPoints: { lat: number; lng: number }[];
  /** One-shot fit bounds for post-pickup (driver + destination). */
  pickedUpFitPoints: { lat: number; lng: number }[];
  /** Center on default city when no active delivery framing applies. */
  defaultCity: boolean;
};

export type MapSnapshot = {
  isReady: boolean;
  mapProjectionReady: boolean;
  driver: MapSnapshotCoords & { heading?: number };
  destination: MapSnapshotCoords;
  store: MapSnapshotCoords;
  stage: MapStage;
  ui: {
    showDriverMarker: boolean;
    showDestinationMarker: boolean;
    showStoreMarker: boolean;
    showRoute: boolean;
  };
  /** Camera framing derived from stage + coords — applied inside render loop only. */
  camera: MapCameraIntent;
  /** GPS trail polyline — rendered when ui.showRoute */
  routePoints: { lat: number; lng: number }[];
};

export type MapSnapshotInput = {
  mapProjectionReady: boolean;
  stage: MapStage;
  driverLat?: unknown;
  driverLng?: unknown;
  driverHeading?: number;
  destinationLat?: unknown;
  destinationLng?: unknown;
  storeLat?: unknown;
  storeLng?: unknown;
  routePoints?: { lat: number; lng: number }[];
  gpsReady?: boolean;
};

export const EMPTY_MAP_SNAPSHOT: MapSnapshot = {
  isReady: false,
  mapProjectionReady: false,
  driver: { lat: null, lng: null, heading: 0 },
  destination: { lat: null, lng: null },
  store: { lat: null, lng: null },
  stage: 'idle',
  ui: {
    showDriverMarker: false,
    showDestinationMarker: false,
    showStoreMarker: false,
    showRoute: false,
  },
  camera: {
    assignedFitPoints: [],
    pickedUpFitPoints: [],
    defaultCity: true,
  },
  routePoints: [],
};

export type TrackingMapSnapshotInput = {
  stage: MapStage;
  driverLat?: number | null;
  driverLng?: number | null;
  driverHeading?: number;
  destinationLat?: number | null;
  destinationLng?: number | null;
  storeLat?: number | null;
  storeLng?: number | null;
  routePoints?: { lat: number; lng: number }[];
  gpsReady?: boolean;
};

/** Legacy stage alias used by delivery UI */
export type TrackingStage = 'assigned' | 'picked_up' | 'in_transit' | 'arrived' | null;

export function trackingStageToMapStage(stage: TrackingStage | string | null | undefined): MapStage {
  if (!stage) return 'idle';
  if (stage === 'delivered') return 'delivered';
  if (
    stage === 'assigned' ||
    stage === 'picked_up' ||
    stage === 'in_transit' ||
    stage === 'arrived'
  ) {
    return stage;
  }
  return 'idle';
}
