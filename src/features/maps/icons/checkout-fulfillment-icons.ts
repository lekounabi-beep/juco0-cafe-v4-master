/**
 * Lucide fulfillment icons — single source for checkout FulfillmentStep
 * and Mapbox café marker DOM rendering.
 *
 * @see src/features/checkout/components/FulfillmentStep.tsx
 */

/** Uber / delivery-ecosystem map positive green (Wolt-style circular venue badges). */
export const DELIVERY_VENUE_MARKER_GREEN = "#06C167";

export const JUCO_CAFE_MARKER_RING = "#ffffff";
export const JUCO_CAFE_MARKER_SIZE_PX = 40;
export const JUCO_CAFE_MARKER_RING_PX = 3;
export const JUCO_CAFE_MARKER_ICON_PX = 20;

type IconSvgOptions = {
  stroke?: string;
  size?: number;
  strokeWidth?: number;
};

/** Lucide `Truck` — checkout «Παράδοση». */
export function lucideTruckIconSvg({
  stroke = "#ffffff",
  size = JUCO_CAFE_MARKER_ICON_PX,
  strokeWidth = 2,
}: IconSvgOptions = {}): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="7" cy="18" r="2"/>
    </svg>
  `.trim();
}

/** Lucide `Store` — checkout «Παραλαβή». */
export function lucideStoreIconSvg({
  stroke = "#ffffff",
  size = JUCO_CAFE_MARKER_ICON_PX,
  strokeWidth = 2,
}: IconSvgOptions = {}): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M15 21V13a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  `.trim();
}

/** Storefront / shop awning icon for map markers. */
export function storefrontMarkerIconSvg({
  stroke = "#ffffff",
  size = JUCO_CAFE_MARKER_ICON_PX,
  strokeWidth = 1.8,
}: IconSvgOptions = {}): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 9.5 5.2 5h13.6L20 9.5"/>
      <path d="M4 9.5h16"/>
      <path d="M5 9.5v1.1a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-1.1"/>
      <path d="M9 9.5v1.1a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-1.1"/>
      <path d="M13 9.5v1.1a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-1.1"/>
      <path d="M6 12.5V19h12v-6.5"/>
      <path d="M9 19v-3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V19"/>
    </svg>
  `.trim();
}
