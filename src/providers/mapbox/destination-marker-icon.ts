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
 * Classic Google Maps–style red destination pin for Mapbox symbol layer.
 */

export const DESTINATION_MARKER_IMAGE_ID = 'tracking-destination-marker';

const DESTINATION_MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42" fill="none">
  <path d="M16 40C16 40 29 25.5 29 15C29 7.82 23.18 2 16 2C8.82 2 3 7.82 3 15C3 25.5 16 40 16 40Z" fill="#EA4335" stroke="#B31412" stroke-width="1.25"/>
  <circle cx="16" cy="15" r="5.5" fill="#ffffff"/>
</svg>`;

export function createDestinationMarkerImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(32, 42);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load destination marker icon'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DESTINATION_MARKER_SVG)}`;
  });
}

export function destinationMarkerIconDataUrl(): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DESTINATION_MARKER_SVG)}`;
}
