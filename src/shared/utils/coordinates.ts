/**
 * Coordinate validation and normalization for map markers.
 */

import type { Coordinates } from "@/shared/types/common.types";

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

export function isValidLatLng(
  coords: { lat?: unknown; lng?: unknown } | null | undefined,
): coords is Coordinates {
  if (!coords) return false;

  const lat = typeof coords.lat === "number" ? coords.lat : Number(coords.lat);
  const lng = typeof coords.lng === "number" ? coords.lng : Number(coords.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) return false;
  if (lat === 0 && lng === 0) return false;

  return true;
}

export function normalizeCoordinates(
  coords: { lat?: unknown; lng?: unknown } | null | undefined,
): Coordinates | null {
  if (!isValidLatLng(coords)) return null;
  return {
    lat: typeof coords.lat === "number" ? coords.lat : Number(coords.lat),
    lng: typeof coords.lng === "number" ? coords.lng : Number(coords.lng),
  };
}
