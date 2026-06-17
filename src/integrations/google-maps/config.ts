/**
 * Google Maps configuration
 */

export const googleMapsConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  defaultCenter: {
    lat: 38.3930,
    lng: 21.8280,
  },
  defaultZoom: 13,
  deliveryZoom: 16,
  region: 'GR',
  language: 'el',
} as const;
