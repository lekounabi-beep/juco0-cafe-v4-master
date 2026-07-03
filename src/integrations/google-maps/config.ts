/**
 * Google Maps configuration
 *
 * Restrict NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Google Cloud Console:
 * - HTTP referrers: your zrok domain, localhost, and final production domain
 * - APIs: Maps JavaScript API only (minimum required)
 * See docs/PUBLIC_API_KEYS.md for full production checklist.
 */

export const googleMapsConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  defaultCenter: {
    lat: 38.393,
    lng: 21.828,
  },
  defaultZoom: 13,
  deliveryZoom: 16,
  region: "GR",
  language: "el",
} as const;
