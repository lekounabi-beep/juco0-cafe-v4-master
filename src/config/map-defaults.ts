/**
 * Provider-neutral map defaults for live tracking (camera + initial view).
 */

/** Juco Cafe — fixed store location (Mapbox / tracking). */
export const storeLocation = {
  lat: 38.3911807457238,
  lng: 21.824054521794686,
} as const;

export const mapDefaults = {
  center: storeLocation,
  zoom: 13,
  fitPadding: 56,
} as const;
