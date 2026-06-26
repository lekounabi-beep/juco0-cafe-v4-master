/**
 * @deprecated
 *
 * Legacy tracking pipeline.
 *
 * Replaced by Tracking V2.
 *
 * Do not add new functionality here.
 * Scheduled for removal after V2 validation.
 */
/**
 * Mapbox configuration for live tracking maps.
 */

import { mapDefaults } from '@/config/map-defaults';

export const mapboxConfig = {
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  style: 'mapbox://styles/mapbox/dark-v11',
  defaultCenter: mapDefaults.center,
  defaultZoom: mapDefaults.zoom,
} as const;
