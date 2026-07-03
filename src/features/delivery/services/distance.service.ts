/**
 * Distance Service
 * Haversine distance calculation for GPS coordinates
 */

import type { Coordinates } from "@/shared/types/common.types";

/**
 * Earth radius in meters
 */
const EARTH_RADIUS = 6371000;

/**
 * Calculate Haversine distance between two coordinates
 * @param from Starting coordinates
 * @param to Ending coordinates
 * @returns Distance in meters
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lng - from.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c;
}

/**
 * Calculate bearing (heading) from one coordinate to another
 * @param from Starting coordinates
 * @param to Ending coordinates
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLon = toRadians(to.lng - from.lng);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Calculate heading difference between two bearings
 * @param from Starting bearing in degrees
 * @param to Ending bearing in degrees
 * @returns Heading difference in degrees (0-180)
 */
export function calculateHeadingDifference(from: number, to: number): number {
  const diff = Math.abs(from - to);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Check if two coordinates are the same (within tolerance)
 * @param coord1 First coordinates
 * @param coord2 Second coordinates
 * @param tolerance Tolerance in meters (default: 1 meter)
 * @returns True if coordinates are the same within tolerance
 */
export function areCoordinatesSame(
  coord1: Coordinates,
  coord2: Coordinates,
  tolerance: number = 1,
): boolean {
  return calculateDistance(coord1, coord2) <= tolerance;
}

/**
 * Check if a location jump is obviously incorrect
 * @param from Previous coordinates
 * @param to New coordinates
 * @param maxJump Maximum allowed jump in meters (default: 500m)
 * @returns True if jump is obviously incorrect
 */
export function isObviousJump(from: Coordinates, to: Coordinates, maxJump: number = 500): boolean {
  return calculateDistance(from, to) > maxJump;
}
