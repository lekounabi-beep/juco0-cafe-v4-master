/**
 * renderMapFromSnapshot — deterministic map renderer with in-place marker updates.
 * Map instance is stable; layers are updated without full teardown when possible.
 */

import { hasMapCoords } from '../utils/normalize-coordinates';
import type { MapSnapshot } from './map-snapshot.types';

const TRAIL_COLOR = '#16a34a';
const TRAIL_WEIGHT = 6;
const TRAIL_OPACITY = 0.9;

type RenderLayerBundle = {
  driverMarker: google.maps.Marker | null;
  destinationMarker: google.maps.Marker | null;
  storeMarker: google.maps.Marker | null;
  routePolyline: google.maps.Polyline | null;
  routePointCount: number;
};

const bundles = new WeakMap<google.maps.Map, RenderLayerBundle>();

function emptyBundle(): RenderLayerBundle {
  return {
    driverMarker: null,
    destinationMarker: null,
    storeMarker: null,
    routePolyline: null,
    routePointCount: 0,
  };
}

function getBundle(map: google.maps.Map): RenderLayerBundle {
  let bundle = bundles.get(map);
  if (!bundle) {
    bundle = emptyBundle();
    bundles.set(map, bundle);
  }
  return bundle;
}

function hideMarker(marker: google.maps.Marker | null): void {
  marker?.setMap(null);
}

export function destroyMapSnapshotRenderer(map: google.maps.Map): void {
  const bundle = bundles.get(map);
  if (!bundle) return;
  hideMarker(bundle.driverMarker);
  hideMarker(bundle.destinationMarker);
  hideMarker(bundle.storeMarker);
  bundle.routePolyline?.setMap(null);
  bundles.delete(map);
}

function toLatLng(p: { lat: number; lng: number }): google.maps.LatLng {
  return new google.maps.LatLng(p.lat, p.lng);
}

function syncStoreMarker(
  map: google.maps.Map,
  bundle: RenderLayerBundle,
  snapshot: MapSnapshot
): void {
  if (!snapshot.ui.showStoreMarker || !hasMapCoords(snapshot.store)) {
    hideMarker(bundle.storeMarker);
    bundle.storeMarker = null;
    return;
  }

  const position = toLatLng({ lat: snapshot.store.lat, lng: snapshot.store.lng });
  if (bundle.storeMarker) {
    bundle.storeMarker.setPosition(position);
    bundle.storeMarker.setMap(map);
    return;
  }

  bundle.storeMarker = new google.maps.Marker({
    map,
    optimized: false,
    position,
    zIndex: 400,
  });
}

function syncDestinationMarker(
  map: google.maps.Map,
  bundle: RenderLayerBundle,
  snapshot: MapSnapshot
): void {
  if (!snapshot.ui.showDestinationMarker || !hasMapCoords(snapshot.destination)) {
    hideMarker(bundle.destinationMarker);
    bundle.destinationMarker = null;
    return;
  }

  const position = toLatLng({ lat: snapshot.destination.lat, lng: snapshot.destination.lng });
  if (bundle.destinationMarker) {
    bundle.destinationMarker.setPosition(position);
    bundle.destinationMarker.setMap(map);
    return;
  }

  bundle.destinationMarker = new google.maps.Marker({
    map,
    optimized: false,
    position,
    zIndex: 500,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#ffffff',
      fillOpacity: 1,
      strokeColor: '#10b981',
      strokeWeight: 3,
    },
  });
}

function syncDriverMarker(
  map: google.maps.Map,
  bundle: RenderLayerBundle,
  snapshot: MapSnapshot
): void {
  if (!snapshot.ui.showDriverMarker || snapshot.driver.lat == null || snapshot.driver.lng == null) {
    hideMarker(bundle.driverMarker);
    bundle.driverMarker = null;
    return;
  }

  const position = toLatLng({ lat: snapshot.driver.lat, lng: snapshot.driver.lng });
  const heading = snapshot.driver.heading ?? 0;

  if (bundle.driverMarker) {
    bundle.driverMarker.setPosition(position);
    const icon = bundle.driverMarker.getIcon();
    if (typeof icon === 'object' && icon != null) {
      bundle.driverMarker.setIcon({ ...icon, rotation: heading });
    }
    bundle.driverMarker.setMap(map);
    return;
  }

  bundle.driverMarker = new google.maps.Marker({
    map,
    optimized: false,
    position,
    zIndex: 1000,
    icon: {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 6,
      fillColor: '#10b981',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 1.5,
      rotation: heading,
    },
  });
}

function syncRoute(
  map: google.maps.Map,
  bundle: RenderLayerBundle,
  snapshot: MapSnapshot
): void {
  if (!snapshot.ui.showRoute || snapshot.routePoints.length < 2) {
    bundle.routePolyline?.setMap(null);
    bundle.routePolyline = null;
    bundle.routePointCount = 0;
    return;
  }

  const path = snapshot.routePoints.map(toLatLng);

  if (bundle.routePolyline) {
    bundle.routePolyline.setPath(path);
    bundle.routePolyline.setMap(map);
    bundle.routePointCount = path.length;
    return;
  }

  bundle.routePolyline = new google.maps.Polyline({
    map,
    path,
    strokeColor: TRAIL_COLOR,
    strokeWeight: TRAIL_WEIGHT,
    strokeOpacity: TRAIL_OPACITY,
    geodesic: true,
    zIndex: 300,
  });
  bundle.routePointCount = path.length;
}

/**
 * Sync map layers from snapshot — updates markers in place, no full map re-init.
 */
export function renderMapFromSnapshot(map: google.maps.Map, snapshot: MapSnapshot): void {
  const bundle = getBundle(map);
  syncStoreMarker(map, bundle, snapshot);
  syncDestinationMarker(map, bundle, snapshot);
  syncDriverMarker(map, bundle, snapshot);
  syncRoute(map, bundle, snapshot);
}

export function getRendererDebugState(map: google.maps.Map): {
  markerAlive: boolean;
  polylineAlive: boolean;
} {
  const bundle = bundles.get(map);
  return {
    markerAlive: !!bundle?.driverMarker?.getMap(),
    polylineAlive: !!bundle?.routePolyline?.getMap(),
  };
}
