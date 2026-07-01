import { ENABLE_TRACKING_V2_DEBUG } from '../config/debug';

export type TrackingV2Surface = 'customer' | 'driver';

export type TrackingV2TelemetryContext = {
  surface?: TrackingV2Surface;
  assignmentId?: string | null;
};

export function trackV2(
  event:
    | 'mounted'
    | 'ready'
    | 'unmounted'
    | 'resize'
    | 'destination_updated'
    | 'driver_updated'
    | 'map_error'
    | 'map_load'
    | 'map_remove'
    | 'trail_updated',
  payload?: Record<string, unknown>
): void {
  if (!ENABLE_TRACKING_V2_DEBUG) return;
  console.info(`[TrackingV2] ${event}`, payload ?? {});
}

export function trackV2Realtime(
  event:
    | 'gps_seed_received'
    | 'connected'
    | 'disconnected'
    | 'gps_update_committed'
    | 'gps_update_dropped'
    | 'history_resync_started'
    | 'history_resync_completed',
  payload?: Record<string, unknown>
): void {
  if (!ENABLE_TRACKING_V2_DEBUG) return;
  console.info(`[TrackingV2] realtime_${event}`, payload ?? {});
}
