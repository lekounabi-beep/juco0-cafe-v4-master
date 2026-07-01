/**
 * Dev-only poll coordinator telemetry.
 */

export type TrackingSessionTelemetryEvent =
  | 'poll_started'
  | 'poll_skipped'
  | 'poll_paused'
  | 'poll_resumed'
  | 'poll_stopped'
  | 'poll_completed'
  | 'gps_merge';

export function trackSessionTelemetry(
  event: TrackingSessionTelemetryEvent,
  payload?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== 'development') return;
  console.info(`[TrackingSession] ${event}`, payload ?? {});
}
