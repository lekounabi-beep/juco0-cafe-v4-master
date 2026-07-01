'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { orderCoordinates } from '@/shared/utils/order-fields';
import { LiveTrackingMap } from './LiveTrackingMap';
import type { DriverTrailDebugState } from './LiveTrackingMap';
import { TrackingV2DebugPanel } from './TrackingV2DebugPanel';
import type { CustomerTrackingDebugSnapshot } from '../types/customer-tracking-debug.types';
import type { TrailPoint } from '../utils/driver-trail-geojson';
import { V2TrackingStatusCard } from './V2TrackingStatusCard';
import { useLiveDriverLocation } from '../hooks/useLiveDriverLocation';
import { trackV2 } from '../telemetry/tracking-v2-telemetry';
import type { TrackingConnectionState } from '@/features/tracking/types/tracking-session.types';

type V2OrderFields = {
  id?: string;
  lat?: number | null;
  lng?: number | null;
  coords?: { lat?: number | string; lng?: number | string } | null;
};

type V2Assignment = {
  id: string;
};

/** Session props — when provided, V2 does NOT fetch (pure presentation). */
export type V2TrackingSessionProps = {
  driverLocation: { lat: number; lng: number } | null;
  connectionState: TrackingConnectionState;
  locationLoading: boolean;
  locationError: string | null;
  lastUpdatedAt: string | null;
};

export type V2TrackingSectionProps = {
  order: V2OrderFields | null;
  assignment: V2Assignment | null;
  /** When set, skips internal useLiveDriverLocation fetch. */
  session?: V2TrackingSessionProps;
  /** Customer tracking debug snapshot for dev panel. */
  customerDebug?: CustomerTrackingDebugSnapshot;
  /** Chronological in-transit GPS trail for map polyline. */
  routePoints?: TrailPoint[];
  /** Show green driver movement trail (in_transit only). */
  showDriverTrail?: boolean;
};

export function V2TrackingSection({
  order,
  assignment,
  session,
  customerDebug,
  routePoints = [],
  showDriverTrail = false,
}: V2TrackingSectionProps) {
  const destinationCacheRef = useRef<{ lat: number; lng: number } | null>(null);
  const destination = useMemo(() => {
    const next = orderCoordinates(order);
    if (!next) {
      destinationCacheRef.current = null;
      return null;
    }
    const cached = destinationCacheRef.current;
    if (cached && cached.lat === next.lat && cached.lng === next.lng) {
      return cached;
    }
    destinationCacheRef.current = next;
    return next;
  }, [
    order?.lat,
    order?.lng,
    order?.coords?.lat,
    order?.coords?.lng,
  ]);
  const assignmentId = assignment?.id ?? '';
  const orderId = order?.id ?? '';

  const legacy = useLiveDriverLocation(assignmentId, orderId, {
    enabled: !session,
  });

  const location = session
    ? session.driverLocation
    : legacy.location;
  const loading = session ? session.locationLoading : legacy.loading;
  const connected = session
    ? session.connectionState === 'polling' || session.connectionState === 'idle'
    : legacy.connected;
  const locationError = session ? session.locationError : legacy.error;
  const lastUpdatedAt = session ? session.lastUpdatedAt : legacy.lastUpdatedAt;

  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [trailDebug, setTrailDebug] = useState<DriverTrailDebugState | null>(null);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const lastRenderTimeRef = useRef<string | null>(null);
  const lastRenderDepsRef = useRef('');
  const renderDepsKey = [
    destination?.lat,
    destination?.lng,
    location?.lat,
    location?.lng,
    connected,
    loading,
    locationError,
    lastUpdatedAt,
    mapStatus,
    showDriverTrail,
    routePoints.length,
  ].join('|');

  if (renderDepsKey !== lastRenderDepsRef.current) {
    lastRenderDepsRef.current = renderDepsKey;
    lastRenderTimeRef.current = new Date().toISOString();
  }

  const handleTrailDebugChange = useCallback((state: DriverTrailDebugState) => {
    setTrailDebug((previous) => {
      if (
        previous &&
        previous.trailVisible === state.trailVisible &&
        previous.trailPoints === state.trailPoints &&
        previous.trailSourceReady === state.trailSourceReady &&
        previous.trailLayerReady === state.trailLayerReady
      ) {
        return previous;
      }
      return state;
    });
  }, []);

  const mergedCustomerDebug = useMemo(
    (): CustomerTrackingDebugSnapshot | undefined => {
      if (!customerDebug && !trailDebug) return undefined;
      return {
        ...customerDebug,
        trailVisible: trailDebug?.trailVisible,
        trailPoints: trailDebug?.trailPoints,
        trailSourceReady: trailDebug?.trailSourceReady,
        trailLayerReady: trailDebug?.trailLayerReady,
      };
    },
    [customerDebug, trailDebug],
  );

  useEffect(() => {
    trackV2('mounted', {
      surface: 'customer',
      assignmentId: assignment?.id ?? null,
      mode: session ? 'session' : 'legacy',
    });
    return () => {
      trackV2('unmounted', {
        surface: 'customer',
        assignmentId: assignment?.id ?? null,
      });
    };
  }, [assignment?.id, Boolean(session)]);

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
      lastRenderTime={lastRenderTimeRef.current}
      locationError={locationError}
      renderCount={renderCountRef.current}
      customerDebug={mergedCustomerDebug}
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
            locationError={locationError}
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
          routePoints={routePoints}
          showDriverTrail={showDriverTrail}
          telemetryContext={{
            surface: 'customer',
            assignmentId: assignment?.id ?? null,
          }}
          onMapStatusChange={setMapStatus}
          onTrailDebugChange={handleTrailDebugChange}
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
          locationError={locationError}
        />
        {debugPanel}
      </div>
    </section>
  );
}
