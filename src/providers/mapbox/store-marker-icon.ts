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
 * Green store pin with a painted shop front — used as Mapbox symbol icon.
 */

export const STORE_MARKER_IMAGE_ID = 'tracking-store-marker';

const STORE_MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56" fill="none">
  <path d="M24 52C24 52 42 33.5 42 22C42 11.85 34.15 4 24 4C13.85 4 6 11.85 6 22C6 33.5 24 52 24 52Z" fill="#16a34a" stroke="#ffffff" stroke-width="2.5"/>
  <rect x="14" y="17" width="20" height="14" rx="1.5" fill="#ffffff"/>
  <path d="M13 17H35L33 12.5H15L13 17Z" fill="#ffffff"/>
  <rect x="16.5" y="19.5" width="4.5" height="4.5" rx="0.5" fill="#16a34a"/>
  <rect x="27" y="19.5" width="4.5" height="4.5" rx="0.5" fill="#16a34a"/>
  <rect x="21" y="24" width="6" height="7" rx="0.5" fill="#16a34a"/>
</svg>`;

export function createStoreMarkerImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(48, 56);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load store marker icon'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STORE_MARKER_SVG)}`;
  });
}

export function storeMarkerIconDataUrl(): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STORE_MARKER_SVG)}`;
}
