/**
 * Mapbox settings for live-tracking-v2.
 * Same token and style as checkout AddressMap (useMapbox).
 */

import { mapDefaults } from "@/config/map-defaults";

export const liveTrackingMapboxConfig = {
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
  style: "mapbox://styles/mapbox/dark-v11" as const,
  defaultCenter: mapDefaults.center,
  defaultZoom: mapDefaults.zoom,
  fitPadding: mapDefaults.fitPadding,
} as const;
