/**
 * MapSnapshotEngine — pure snapshot builder (ONLY map rendering SSOT).
 */

import { hasMapCoords, normalizeMapPoint, normalizeMapPointOrNull } from '../utils/normalize-coordinates';
import {
  EMPTY_MAP_SNAPSHOT,
  type MapCameraIntent,
  type MapSnapshot,
  type MapSnapshotInput,
  type MapStage,
} from './map-snapshot.types';

function deriveCameraIntent(
  stage: MapStage,
  store: { lat: number | null; lng: number | null },
  destination: { lat: number | null; lng: number | null },
  driver: { lat: number | null; lng: number | null },
  ui: MapSnapshot['ui']
): MapCameraIntent {
  const assignedFitPoints: { lat: number; lng: number }[] = [];
  if (ui.showStoreMarker && hasMapCoords(store)) {
    assignedFitPoints.push({ lat: store.lat, lng: store.lng });
  }
  if (ui.showDestinationMarker && hasMapCoords(destination)) {
    assignedFitPoints.push({ lat: destination.lat, lng: destination.lng });
  }

  const pickedUpFitPoints: { lat: number; lng: number }[] = [];
  if (hasMapCoords(driver)) {
    pickedUpFitPoints.push({ lat: driver.lat, lng: driver.lng });
  }
  if (hasMapCoords(destination)) {
    pickedUpFitPoints.push({ lat: destination.lat, lng: destination.lng });
  }

  const defaultCity =
    stage === 'idle' || stage === 'delivered' || (stage === 'assigned' && assignedFitPoints.length === 0);

  return { assignedFitPoints, pickedUpFitPoints, defaultCity };
}

function deriveUi(
  stage: MapStage,
  hasDriver: boolean,
  gpsReady: boolean
): MapSnapshot['ui'] {
  switch (stage) {
    case 'assigned':
      return {
        showStoreMarker: true,
        showDestinationMarker: true,
        showDriverMarker: gpsReady && hasDriver,
        showRoute: false,
      };
    case 'picked_up':
    case 'in_transit':
    case 'arrived':
      return {
        showStoreMarker: false,
        showDestinationMarker: true,
        showDriverMarker: hasDriver,
        showRoute: true,
      };
    case 'delivered':
    case 'idle':
    default:
      return {
        showStoreMarker: false,
        showDestinationMarker: false,
        showDriverMarker: false,
        showRoute: false,
      };
  }
}

export function buildMapSnapshot(input: MapSnapshotInput): MapSnapshot {
  const driverPoint = normalizeMapPoint({ lat: input.driverLat, lng: input.driverLng });
  const destination = normalizeMapPointOrNull(input.destinationLat, input.destinationLng);
  const store = normalizeMapPointOrNull(input.storeLat, input.storeLng);

  const hasDriver = driverPoint != null;
  const gpsReady = input.gpsReady ?? hasDriver;
  const ui = deriveUi(input.stage, hasDriver, gpsReady);

  const routePoints =
    ui.showRoute && input.routePoints?.length
      ? input.routePoints
          .map((p) => normalizeMapPoint(p))
          .filter((p): p is { lat: number; lng: number } => p != null)
      : [];

  const driver = {
    lat: driverPoint?.lat ?? null,
    lng: driverPoint?.lng ?? null,
    heading: input.driverHeading ?? 0,
  };

  return {
    isReady: true,
    mapProjectionReady: input.mapProjectionReady ?? true,
    driver,
    destination,
    store,
    stage: input.stage,
    ui,
    camera: deriveCameraIntent(input.stage, store, destination, driver, ui),
    routePoints,
  };
}

export function withProjectionReady(
  snapshot: MapSnapshot,
  mapProjectionReady: boolean
): MapSnapshot {
  if (snapshot.mapProjectionReady === mapProjectionReady) return snapshot;
  return { ...snapshot, mapProjectionReady };
}

export { EMPTY_MAP_SNAPSHOT };
