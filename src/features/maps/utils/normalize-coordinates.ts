/**
 * Map coordinate normalization — ALL GPS/map coords must pass through here.
 */

import { normalizeCoordinates as baseNormalize } from '@/shared/utils/coordinates';

export type MapPoint = { lat: number; lng: number };

const LAT_MIN = -90;
const LAT_MAX = 90;

/** Detect lat/lng swapped when values look like Greece/Europe bounds. */
function maybeSwapLatLng(lat: number, lng: number): MapPoint {
  const latLooksLikeLng = lat > LAT_MAX || lat < LAT_MIN;
  const lngLooksLikeLat = lng >= LAT_MIN && lng <= LAT_MAX && Math.abs(lng) <= 90;
  if (latLooksLikeLng && lngLooksLikeLat) {
    return { lat: lng, lng: lat };
  }
  return { lat, lng };
}

export function normalizeMapPoint(
  coords: { lat?: unknown; lng?: unknown } | null | undefined
): MapPoint | null {
  const normalized = baseNormalize(coords);
  if (!normalized) return null;
  return maybeSwapLatLng(normalized.lat, normalized.lng);
}

export function normalizeMapPointOrNull(
  lat: unknown,
  lng: unknown
): { lat: number | null; lng: number | null } {
  const point = normalizeMapPoint({ lat, lng });
  if (!point) return { lat: null, lng: null };
  return point;
}

export function hasMapCoords(point: {
  lat: number | null;
  lng: number | null;
}): point is { lat: number; lng: number } {
  return point.lat != null && point.lng != null;
}
