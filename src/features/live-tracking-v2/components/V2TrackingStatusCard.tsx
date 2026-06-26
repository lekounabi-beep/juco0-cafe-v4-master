'use client';

type V2TrackingStatusCardProps = {
  connected: boolean;
  lastUpdatedAt: string | null;
  assignmentId: string | null;
  driverLocationPresent: boolean;
  locationError: string | null;
};

export function V2TrackingStatusCard({
  connected,
  lastUpdatedAt,
  assignmentId,
  driverLocationPresent,
  locationError,
}: V2TrackingStatusCardProps) {
  const lastGpsLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString('el-GR')
    : '—';

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/70">
      <p className="mb-2 font-semibold uppercase tracking-wide text-white/50">Tracking V2</p>
      <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <div className="flex justify-between gap-2 sm:block">
          <dt>Realtime Connected</dt>
          <dd className={connected ? 'text-emerald-400' : 'text-amber-400'}>
            {connected ? 'Yes' : 'No'}
          </dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt>Last GPS Update</dt>
          <dd className="text-white/90">{lastGpsLabel}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt>Assignment ID</dt>
          <dd className="truncate font-mono text-white/90">{assignmentId ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt>Driver Location Present</dt>
          <dd className={driverLocationPresent ? 'text-emerald-400' : 'text-white/50'}>
            {driverLocationPresent ? 'Yes' : 'No'}
          </dd>
        </div>
      </dl>
      {locationError && (
        <p className="mt-2 text-amber-300/90">Location: {locationError}</p>
      )}
    </div>
  );
}
