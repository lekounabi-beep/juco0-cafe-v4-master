/**
 * Customer Tracking Page
 * Live delivery tracking experience similar to Wolt/Uber Eats
 */

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EspressoBackground } from '@/components/EspressoBackground';
import { useETA } from '@/features/delivery/hooks/useETA';
import { formatETA, formatDistance } from '@/features/delivery/services/eta.service';
import { CustomerDeliveryTimelineUI } from '@/features/tracking/components/CustomerDeliveryTimelineUI';
import { useCustomerTrackingSync } from '@/features/tracking/hooks/useCustomerTrackingSync';
import { useTrackingSession } from '@/features/tracking/hooks/useTrackingSession';
import { isTrackingSessionEnabled } from '@/features/tracking/config/tracking-session-flag';
import { orderCoordinates } from '@/shared/utils/order-fields';
import { useDeliveryState } from '@/features/delivery/hooks/useDeliveryState';
import { speedFromKmh } from '@/features/delivery/services/speed.service';
import { MapPin, Package, AlertCircle } from 'lucide-react';
import { V2TrackingSection } from '@/features/live-tracking-v2';
import type { CustomerTrackingDebugSnapshot } from '@/features/live-tracking-v2/types/customer-tracking-debug.types';
import { isTerminalOrder } from '@/features/tracking/core/terminal-order';
import type { CustomerOrderStep } from '@/shared/utils/customer-status';
import type { TrackingOrder } from '@/features/tracking/hooks/useCustomerTrackingSync';

const FALLBACK_ETA_SPEED_MS = speedFromKmh(25);

function TrackPageLegacy({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { order, driver, delivery, loading, error } = useCustomerTrackingSync(orderId);

  const { deliveryState, locationDebug } = useDeliveryState({
    order,
    assignment: delivery,
    role: 'customer',
  });

  const customerDebug = useMemo(
    (): CustomerTrackingDebugSnapshot => ({
      connectionState: error ? 'error' : loading ? 'idle' : 'polling',
      trackingSessionEnabled: false,
      gpsPointsLoaded: locationDebug.locationCount,
      lastGpsTimestamp: deliveryState.driverPosition?.recordedAt ?? null,
      orderStatus: order?.status,
      assignmentStatus: order?.delivery_status ?? deliveryState.deliveryStatus,
      customerStep: deliveryState.customerStep,
      isTerminal: order ? isTerminalOrder(order) : false,
      pollingActive: locationDebug.realtimeConnected,
    }),
    [
      error,
      loading,
      locationDebug.locationCount,
      locationDebug.realtimeConnected,
      deliveryState.driverPosition?.recordedAt,
      deliveryState.deliveryStatus,
      deliveryState.customerStep,
      order,
    ],
  );

  return (
    <TrackPageShell
      router={router}
      order={order}
      driver={driver}
      delivery={delivery}
      loading={loading}
      error={error}
      customerStep={deliveryState.customerStep}
      deliveryStatus={deliveryState.deliveryStatus}
      driverPosition={deliveryState.driverPosition}
      v2Session={undefined}
      customerDebug={customerDebug}
      routePoints={deliveryState.routePoints}
      showDriverTrail={deliveryState.showDriverTrail}
    />
  );
}

function TrackPageSession({ orderId }: { orderId: string }) {
  const router = useRouter();
  const session = useTrackingSession(orderId);

  const driverPosition = session.deliveryState.driverPosition;

  const v2Session = useMemo(
    () => ({
      driverLocation: session.latestLocation,
      connectionState: session.connectionState,
      locationLoading: session.loading,
      locationError: session.error,
      lastUpdatedAt:
        driverPosition?.recordedAt ??
        session.lastPollAt,
    }),
    [
      session.latestLocation,
      session.connectionState,
      session.loading,
      session.error,
      driverPosition?.recordedAt,
      session.lastPollAt,
    ],
  );

  const customerDebug = useMemo(
    (): CustomerTrackingDebugSnapshot => ({
      connectionState: session.connectionState,
      trackingSessionEnabled: true,
      pollCount: session.pollCount,
      lastPollAt: session.lastPollAt,
      gpsPointsLoaded: session.locations.length,
      lastGpsTimestamp: driverPosition?.recordedAt ?? session.lastPollAt,
      orderStatus: session.order?.status,
      assignmentStatus: session.timeline.deliveryStatus,
      customerStep: session.timeline.customerStep,
      isTerminal: session.isTerminal,
      eta: session.eta,
      etaLastUpdated: session.lastPollAt,
      pollingActive: session.connectionState === 'polling',
    }),
    [
      session.connectionState,
      session.pollCount,
      session.lastPollAt,
      session.locations.length,
      driverPosition?.recordedAt,
      session.order?.status,
      session.timeline.deliveryStatus,
      session.timeline.customerStep,
      session.isTerminal,
      session.eta,
    ],
  );

  return (
    <TrackPageShell
      router={router}
      order={session.order}
      driver={session.driver}
      delivery={session.assignment}
      loading={session.loading}
      error={session.error}
      customerStep={session.timeline.customerStep}
      deliveryStatus={session.timeline.deliveryStatus}
      driverPosition={driverPosition}
      etaFromSession={session.eta}
      v2Session={v2Session}
      customerDebug={customerDebug}
      routePoints={session.routePoints}
      showDriverTrail={session.deliveryState.showDriverTrail}
    />
  );
}

function TrackPageShell({
  router,
  order,
  driver,
  delivery,
  loading,
  error,
  customerStep,
  deliveryStatus,
  driverPosition,
  etaFromSession,
  v2Session,
  customerDebug,
  routePoints = [],
  showDriverTrail = false,
}: {
  router: ReturnType<typeof useRouter>;
  order: TrackingOrder | null;
  driver: { full_name: string } | null;
  delivery: { id: string } | null;
  loading: boolean;
  error: string | null;
  customerStep: CustomerOrderStep;
  deliveryStatus: string;
  driverPosition: { lat: number; lng: number; heading?: number; recordedAt?: string } | null;
  etaFromSession?: ReturnType<typeof useTrackingSession>['eta'];
  v2Session?: React.ComponentProps<typeof V2TrackingSection>['session'];
  customerDebug?: CustomerTrackingDebugSnapshot;
  routePoints?: React.ComponentProps<typeof V2TrackingSection>['routePoints'];
  showDriverTrail?: boolean;
}) {
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

  const driverLocation = useMemo(
    () =>
      driverPosition != null
        ? {
            lat: driverPosition.lat,
            lng: driverPosition.lng,
            heading: driverPosition.heading ?? 0,
          }
        : null,
    [driverPosition?.lat, driverPosition?.lng, driverPosition?.heading],
  );

  const showDriverOnMap = customerStep === 'on_the_way';

  const etaResult = useETA({
    currentLocation:
      showDriverOnMap && driverLocation && !etaFromSession
        ? { lat: driverLocation.lat, lng: driverLocation.lng }
        : null,
    destination,
    averageSpeedMs:
      showDriverOnMap && driverLocation && !etaFromSession ? FALLBACK_ETA_SPEED_MS : 0,
  });

  const etaLabel =
    showDriverOnMap && etaFromSession?.eta
      ? formatETA(etaFromSession.eta)
      : showDriverOnMap && etaResult.etaResult?.eta
        ? formatETA(etaResult.etaResult.eta)
        : null;

  const distanceLabel =
    showDriverOnMap && etaFromSession
      ? formatDistance(etaFromSession.remainingDistance)
      : showDriverOnMap && etaResult.etaResult
        ? formatDistance(etaResult.etaResult.remainingDistance)
        : null;

  const v2CustomerDebug = useMemo((): CustomerTrackingDebugSnapshot | undefined => {
    if (!customerDebug) return undefined;
    const eta =
      customerDebug.eta ??
      (showDriverOnMap && etaResult.etaResult ? etaResult.etaResult : null);
    return {
      ...customerDebug,
      eta,
      etaLastUpdated:
        customerDebug.etaLastUpdated ?? driverPosition?.recordedAt ?? null,
    };
  }, [customerDebug, showDriverOnMap, etaResult.etaResult, driverPosition?.recordedAt]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.log('[TrackPage] driver coordinates changed', {
      driverLat: driverPosition?.lat,
      driverLng: driverPosition?.lng,
      mode: v2Session != null ? 'session' : 'legacy',
    });
  }, [driverPosition?.lat, driverPosition?.lng]);

  const showError = !loading && (error || !order);
  const showContent = !loading && order && !error;

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-white/80">Φόρτωση παραγγελίας...</p>
          </div>
        </div>
      )}

      {showError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="max-w-md text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-400" />
            <h1 className="mb-2 text-2xl font-bold text-white">Παραγγελία δεν βρέθηκε</h1>
            <p className="mb-6 text-white/70">
              {error || 'Η παραγγελία δεν υπάρχει ή έχει διαγραφεί.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90"
            >
              Επιστροφή στην αρχική
            </button>
          </div>
        </div>
      )}

      {showContent && (
        <div className="relative z-10 min-h-screen pb-20">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                  J
                </span>
                <span className="font-display text-lg font-semibold text-white">
                  Παρακολούθηση Παραγγελίας
                </span>
              </div>
              <span className="font-display text-lg font-bold text-white">
                #{order.order_number}
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="mb-6">
              <V2TrackingSection
                order={order}
                assignment={delivery}
                session={v2Session}
                customerDebug={v2CustomerDebug}
                routePoints={routePoints}
                showDriverTrail={showDriverTrail}
              />
            </div>

            <CustomerDeliveryTimelineUI
              customerStep={customerStep}
              orderStatus={order.status}
              deliveryStatus={order.delivery_status ?? deliveryStatus}
              driverName={driver?.full_name}
              eta={etaLabel}
              distance={distanceLabel}
            />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <Package className="h-5 w-5 text-primary" />
                Λεπτομέρειες Παραγγελίας
              </h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-white/80">
                      {item.qty}x {item.name}
                    </span>
                    <span className="text-white/60">{(item.price * item.qty).toFixed(2)}€</span>
                  </div>
                ))}
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Υποσύνολο</span>
                    <span className="text-white/60">{order.subtotal.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Κόστος παράδοσης</span>
                    <span className="text-white/60">{order.delivery_fee.toFixed(2)}€</span>
                  </div>
                  <div className="mt-2 flex justify-between text-base font-semibold text-white">
                    <span>Σύνολο</span>
                    <span>{order.total.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <MapPin className="h-5 w-5 text-primary" />
                Διεύθυνση Παράδοσης
              </h3>
              <p className="text-white/80">{order.address}</p>
              {order.address_notes && (
                <p className="mt-2 text-sm text-white/60">{order.address_notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const useSession = isTrackingSessionEnabled();

  if (useSession) {
    return <TrackPageSession orderId={orderId} />;
  }

  return <TrackPageLegacy orderId={orderId} />;
}
