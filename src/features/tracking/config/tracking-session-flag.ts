/**
 * Feature flag for consolidated customer tracking session (P0 stabilization).
 * Default: false until verified in staging/production.
 */
export function isTrackingSessionEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TRACKING_SESSION === 'true';
}
