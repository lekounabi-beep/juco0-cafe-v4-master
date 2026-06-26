'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { orderCoordinates } from '@/shared/utils/order-fields';
import { LiveTrackingMap } from './LiveTrackingMap';
import { TrackingV2DebugPanel } from './TrackingV2DebugPanel';
import { V2TrackingStatusCard } from './V2TrackingStatusCard';
import { useLiveDriverLocation } from '../hooks/useLiveDriverLocation';
import { trackV2 } from '../telemetry/tracking-v2-telemetry';

type V2OrderFields = {
  lat?: number | null;
  lng?: number | null;
  coords?: { lat?: number | string; lng?: number | string } | null;
};

type V2Assignment = {
  id: string;
};

export type V2TrackingSectionProps = {
  order: V2OrderFields | null;
  assignment: V2Assignment | null;
};

export function V2TrackingSection({ order, assignment }: V2TrackingSectionProps) {
  const destination = useMemo(() => orderCoordinates(order), [order]);
  const assignmentId = assignment?.id ?? '';

  const { location, loading, connected, error, lastUpdatedAt } =
    useLiveDriverLocation(assignmentId);

  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lastRenderTime, setLastRenderTime] = useState<string | null>(null);

  useEffect(() => {
    trackV2('mounted', {
      surface: 'customer',
      assignmentId: assignment?.id ?? null,
    });
    return () => {
      trackV2('unmounted', {
        surface: 'customer',
        assignmentId: assignment?.id ?? null,
      });
    };
  }, []);

  useEffect(() => {
    setLastRenderTime(new Date().toISOString());
  }, [destination, location, connected, loading, error, lastUpdatedAt, mapStatus]);

  const debugPanel = (
    <TrackingV2DebugPanel
      surface="customer"
      assignmentId={assignment?.id ?? null}
      connected={connected}
      loading={loading}
      lastGpsAt={lastUpdatedAt}
      driverLocation={location}
      destination={destination}
      mapStatus={mapStatus}
      lastRenderTime={lastRenderTime}
      locationError={error}
    />
  );

  if (!destination) {
    return (
      <section
        aria-label="Live tracking v2"
        className="overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm font-medium text-red-200">
            Δεν βρέθηκαν συντεταγμένες παράδοσης για τον χάρτη.
          </p>
          <p className="text-xs text-red-200/70">
            Η παραγγελία δεν έχει αποθηκευμένη διεύθυνση με συντεταγμένες.
          </p>
        </div>
        <div className="border-t border-white/10 px-4 py-3">
          <V2TrackingStatusCard
            connected={connected}
            lastUpdatedAt={lastUpdatedAt}
            assignmentId={assignment?.id ?? null}
            driverLocationPresent={location != null}
            locationError={error}
          />
          {debugPanel}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Live tracking v2"
      className="overflow-hidden rounded-2xl border border-primary/30 bg-black/40 backdrop-blur-sm"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="font-display text-base font-semibold text-white">Ζωντανή παρακολούθηση (V2)</h2>
      </div>

      <div className="relative h-[280px] w-full sm:h-[340px]">
        <LiveTrackingMap
          className="h-full"
          destination={destination}
          driverLocation={location ?? undefined}
          telemetryContext={{
            surface: 'customer',
            assignmentId: assignment?.id ?? null,
          }}
          onMapStatusChange={setMapStatus}
        />
      </div>

      {!location && !loading && (
        <p className="border-t border-white/10 px-4 py-3 text-center text-sm text-white/60">
          Ο διανομέας δεν έχει ξεκινήσει ακόμη.
        </p>
      )}

      <div className="border-t border-white/10 px-4 py-3">
        <V2TrackingStatusCard
          connected={connected}
          lastUpdatedAt={lastUpdatedAt}
          assignmentId={assignment?.id ?? null}
          driverLocationPresent={location != null}
          locationError={error}
        />
        {debugPanel}
      </div>
    </section>
  );
}
