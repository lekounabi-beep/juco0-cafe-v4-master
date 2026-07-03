/**
 * Provider-neutral map defaults for live tracking (camera + initial view).
 */

import { JUCO_CAFE_LOCATION } from "@/config/juco-cafe-location";

/** Juco Café — derived from {@link JUCO_CAFE_LOCATION} (lat/lng shape for map helpers). */
export const storeLocation = {
  lat: JUCO_CAFE_LOCATION.latitude,
  lng: JUCO_CAFE_LOCATION.longitude,
} as const;

export const mapDefaults = {
  center: storeLocation,
  zoom: 13,
  fitPadding: 56,
} as const;
