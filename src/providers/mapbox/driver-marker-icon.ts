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
 * Driver marker — side-view delivery scooter on green badge (rotates with heading).
 * Front of scooter points up-right when heading = 0° (north).
 */

export const DRIVER_MARKER_IMAGE_ID = 'tracking-driver-marker';

const DRIVER_MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52" fill="none">
  <circle cx="26" cy="26" r="23" fill="#10B981" stroke="#FFFFFF" stroke-width="2.5"/>
  <circle cx="18.5" cy="35.5" r="6.8" fill="#FFFFFF"/>
  <circle cx="18.5" cy="35.5" r="3.6" fill="#10B981"/>
  <circle cx="18.5" cy="35.5" r="1.4" fill="#FFFFFF"/>
  <circle cx="32.5" cy="19" r="5.6" fill="#FFFFFF"/>
  <circle cx="32.5" cy="19" r="3" fill="#10B981"/>
  <circle cx="32.5" cy="19" r="1.1" fill="#FFFFFF"/>
  <path d="M18.5 29.5C20 26.5 23 23.5 27 22.5L32 24.5" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21 27.5C23.5 24 27 23 30 24.5" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
  <rect x="14.5" y="28" width="6" height="5.5" rx="1.2" fill="#FFFFFF"/>
  <path d="M21.5 31H27" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M32 19V11.5" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M27 11.5H37" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M30.5 20.5L33.5 14.5" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="34.5" cy="17.5" r="2.2" fill="#FFFFFF"/>
</svg>`;

export function createDriverMarkerImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(52, 52);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load driver marker icon'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DRIVER_MARKER_SVG)}`;
  });
}

export function driverMarkerIconDataUrl(): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DRIVER_MARKER_SVG)}`;
}
