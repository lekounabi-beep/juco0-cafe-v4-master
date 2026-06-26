'use client';

import { ENABLE_TRACKING_V2_DEBUG } from '../config/debug';

export type TrackingV2DebugPanelProps = {
  assignmentId?: string | null;
  connected?: boolean | null;
  loading?: boolean;
  lastGpsAt?: string | null;
  driverLocation?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  mapStatus?: 'loading' | 'ready' | 'error' | string;
  lastRenderTime?: string | null;
  locationError?: string | null;
  surface?: 'customer' | 'driver';
};

function formatCoord(point?: { lat: number; lng: number } | null): string {
  if (!point) return '—';
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function TrackingV2DebugPanel({
  assignmentId,
  connected,
  loading,
  lastGpsAt,
  driverLocation,
  destination,
  mapStatus,
  lastRenderTime,
  locationError,
  surface = 'customer',
}: TrackingV2DebugPanelProps) {
  if (!ENABLE_TRACKING_V2_DEBUG) return null;

  const lastGpsLabel = lastGpsAt ? new Date(lastGpsAt).toLocaleString('el-GR') : '—';

  return (
    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-[10px] leading-relaxed text-amber-100/90">
      <p className="mb-1 font-semibold uppercase tracking-wide text-amber-400/80">
        Tracking V2 Debug ({surface})
      </p>
      <dl className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
        <div>
          <dt className="text-amber-200/50">Assignment ID</dt>
          <dd className="truncate">{assignmentId ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Connected</dt>
          <dd>{connected == null ? '—' : connected ? 'yes' : 'no'}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Loading</dt>
          <dd>{loading == null ? '—' : loading ? 'yes' : 'no'}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Last GPS</dt>
          <dd>{lastGpsLabel}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Driver</dt>
          <dd>{formatCoord(driverLocation)}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Destination</dt>
          <dd>{formatCoord(destination)}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Map status</dt>
          <dd>{mapStatus ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Last render</dt>
          <dd>{lastRenderTime ?? '—'}</dd>
        </div>
      </dl>
      {locationError && (
        <p className="mt-1 text-amber-300/80">Error: {locationError}</p>
      )}
    </div>
  );
}
