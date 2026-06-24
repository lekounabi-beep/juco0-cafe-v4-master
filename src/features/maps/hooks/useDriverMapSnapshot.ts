/**
 * Driver map snapshot — feeds MapSnapshotEngine from GPS feed + delivery context.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { buildMapSnapshot } from '@/features/maps/core/map-snapshot-engine';
import {
  getDriverGpsState,
  subscribeDriverGps,
  type DriverGpsState,
} from '@/features/maps/core/driver-gps-feed';
import {
  trackingStageToMapStage,
  type MapSnapshot,
  type TrackingStage,
} from '@/features/maps/core/map-snapshot.types';
import { normalizeMapPoint } from '@/features/maps/utils/normalize-coordinates';

export type DriverMapSnapshotInput = {
  stage: TrackingStage;
  destination: { lat: number; lng: number } | null;
  storeLocation: { lat: number; lng: number };
};

function useDriverGps(): DriverGpsState {
  return useSyncExternalStore(subscribeDriverGps, getDriverGpsState, getDriverGpsState);
}

export function useDriverMapSnapshot({
  stage,
  destination,
  storeLocation,
}: DriverMapSnapshotInput): {
  snapshotInput: {
    stage: ReturnType<typeof trackingStageToMapStage>;
    driverLat: number | null;
    driverLng: number | null;
    driverHeading: number;
    destinationLat: number | null;
    destinationLng: number | null;
    storeLat: number;
    storeLng: number;
    routePoints: { lat: number; lng: number }[];
    gpsReady: boolean;
  };
  hasDestination: boolean;
} {
  const gps = useDriverGps();
  const mapStage = trackingStageToMapStage(stage);
  const dest = normalizeMapPoint(destination);
  const store = normalizeMapPoint(storeLocation) ?? storeLocation;

  const snapshotInput = useMemo(
    () => ({
      stage: mapStage,
      driverLat: gps.driverPosition?.lat ?? null,
      driverLng: gps.driverPosition?.lng ?? null,
      driverHeading: gps.driverHeading,
      destinationLat: dest?.lat ?? null,
      destinationLng: dest?.lng ?? null,
      storeLat: store.lat,
      storeLng: store.lng,
      routePoints: gps.trail,
      gpsReady: gps.gpsReady,
    }),
    [
      mapStage,
      gps.driverPosition?.lat,
      gps.driverPosition?.lng,
      gps.driverHeading,
      gps.trail.length,
      gps.trail[gps.trail.length - 1]?.lat,
      gps.trail[gps.trail.length - 1]?.lng,
      gps.gpsReady,
      dest?.lat,
      dest?.lng,
      store.lat,
      store.lng,
    ]
  );

  return {
    snapshotInput,
    hasDestination: dest != null,
  };
}

export function useDriverTrackingDebug() {
  const gps = useDriverGps();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || gps.lastGpsAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [gps.lastGpsAt]);

  return useMemo(
    () => ({
      realtimeConnected: true,
      lastGpsAgeMs: gps.lastGpsAt != null ? now - gps.lastGpsAt : null,
      gpsReady: gps.gpsReady,
    }),
    [gps.lastGpsAt, now, gps.gpsReady]
  );
}

/** @deprecated Use useDriverMapSnapshot */
export function useDriverTrackingMapState(
  stage: TrackingStage,
  storeLocation: { lat: number; lng: number }
) {
  const { snapshotInput } = useDriverMapSnapshot({
    stage,
    destination: null,
    storeLocation,
  });
  const snapshot: MapSnapshot = buildMapSnapshot({
    mapProjectionReady: false,
    ...snapshotInput,
  });
  return {
    driverPosition:
      snapshot.driver.lat != null
        ? { lat: snapshot.driver.lat, lng: snapshot.driver.lng! }
        : null,
    destination: null,
    trail: snapshot.routePoints,
    heading: snapshot.driver.heading ?? 0,
    gpsReady: snapshotInput.gpsReady,
    mapReady: false,
    storeLocation,
    stage,
  };
}
