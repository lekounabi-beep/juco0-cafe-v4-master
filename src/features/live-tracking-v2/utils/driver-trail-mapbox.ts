import type mapboxgl from 'mapbox-gl';
import {
  emptyDriverTrailGeoJson,
  type DriverTrailGeoJson,
} from './driver-trail-geojson';

export const TRAIL_SOURCE_ID = 'driver-trail-source';
export const TRAIL_LAYER_ID = 'driver-trail-layer';

let lastAppliedTrailLayerKey: string | null = null;

export function resetTrailLayerCache(): void {
  lastAppliedTrailLayerKey = null;
}

export function getLastAppliedTrailLayerKey(): string | null {
  return lastAppliedTrailLayerKey;
}

export function shouldApplyTrailLayerUpdate(
  previousKey: string | null,
  nextKey: string,
): boolean {
  return previousKey !== nextKey;
}

export function ensureDriverTrailLayer(map: mapboxgl.Map): void {
  if (!map.getSource(TRAIL_SOURCE_ID)) {
    map.addSource(TRAIL_SOURCE_ID, {
      type: 'geojson',
      data: emptyDriverTrailGeoJson(),
    });
  }

  if (!map.getLayer(TRAIL_LAYER_ID)) {
    map.addLayer({
      id: TRAIL_LAYER_ID,
      type: 'line',
      source: TRAIL_SOURCE_ID,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'none',
      },
      paint: {
        'line-color': '#22c55e',
        'line-width': 5,
        'line-opacity': 0.95,
        'line-blur': 0.3,
      },
    });
  }
}

export function removeDriverTrailLayer(map: mapboxgl.Map | null): void {
  resetTrailLayerCache();
  if (!map) return;
  if (map.getLayer(TRAIL_LAYER_ID)) {
    map.removeLayer(TRAIL_LAYER_ID);
  }
  if (map.getSource(TRAIL_SOURCE_ID)) {
    map.removeSource(TRAIL_SOURCE_ID);
  }
}

export function updateDriverTrailLayer(
  map: mapboxgl.Map,
  geoJson: DriverTrailGeoJson,
  visible: boolean,
  dataKey: string,
): void {
  const source = map.getSource(TRAIL_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (!source) return;

  const layerKey = dataKey;
  const dataChanged = shouldApplyTrailLayerUpdate(lastAppliedTrailLayerKey, layerKey);

  if (dataChanged) {
    source.setData(geoJson);
    lastAppliedTrailLayerKey = layerKey;
  }

  if (map.getLayer(TRAIL_LAYER_ID)) {
    map.setLayoutProperty(TRAIL_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
  }
}
