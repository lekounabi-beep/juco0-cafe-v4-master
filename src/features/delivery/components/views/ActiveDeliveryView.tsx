'use client';

import { MapPin, Navigation, Phone, Loader2 } from 'lucide-react';
import { DriverLiveMap } from '@/features/live-tracking-v2/components/DriverLiveMap';
import { TrackingV2DebugPanel } from '@/features/live-tracking-v2/components/TrackingV2DebugPanel';
import { ENABLE_TRACKING_V2_DEBUG } from '@/features/live-tracking-v2/config/debug';
import { formatETA } from '@/features/delivery/services/eta.service';
import { DeliveryActions } from '../DeliveryActions';
import { DriverOrderDetailsSection } from '../DriverOrderDetailsSection';
import { buildMapboxDirectionsUrl, buildTelHref } from '../../utils/driver-order-display';
import type { useETA } from '../../hooks/useETA';
import type { DeliveryUiState } from '../../utils/delivery-ui-selector';
import type { ActiveDeliveryView as ActiveDeliveryViewModel } from '../../utils/active-delivery';
import type { DriverOrderDetails } from '../../types/driver-order.types';

interface ActiveDeliveryViewProps {
  activeDeliveryView: ActiveDeliveryViewModel;
  deliveryUi: DeliveryUiState;
  mapDestination: { lat: number; lng: number } | null;
  destinationResolving?: boolean;
  driverLocation?: { lat: number; lng: number } | null;
  routePoints?: { lat: number; lng: number }[];
  showDriverTrail?: boolean;
  hasDestination: boolean;
  onDeliveryAction: (action: string) => void;
  isPickingUp?: boolean;
  deliveryActionLoading?: boolean;
  eta?: ReturnType<typeof useETA>;
}

export function ActiveDeliveryView({
  activeDeliveryView,
  deliveryUi,
  mapDestination,
  destinationResolving = false,
  driverLocation,
  routePoints = [],
  showDriverTrail = false,
  hasDestination,
  onDeliveryAction,
  isPickingUp = false,
  deliveryActionLoading = false,
  eta,
}: ActiveDeliveryViewProps) {
  const order = activeDeliveryView.order as DriverOrderDetails | null;
  const stage = deliveryUi.stage;
  const telHref = order ? buildTelHref(order.customer_phone) : null;
  const directionsUrl = order ? buildMapboxDirectionsUrl(order) : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="relative h-[min(42vh,360px)] min-h-[240px] w-full">
          <DriverLiveMap
            className="h-full"
            destination={mapDestination}
            driverLocation={driverLocation ?? undefined}
            routePoints={routePoints}
            showDriverTrail={showDriverTrail}
            telemetryContext={{
              surface: 'driver',
              assignmentId: activeDeliveryView.assignment?.id ?? null,
            }}
          />
          {!hasDestination && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/50 px-6 text-center">
              <MapPin className="h-10 w-10 text-white/40" />
              <p className="text-sm font-medium text-white/90">
                Αναμονή τοποθεσίας παραγγελίας...
              </p>
              {destinationResolving && (
                <Loader2 className="h-5 w-5 animate-spin text-white/50" />
              )}
            </div>
          )}
        </div>
      </div>

      {order && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/50" aria-hidden />
              <p className="text-sm leading-relaxed text-white/95">{order.address}</p>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
              <span className="text-white/70">Εκτιμώμενος χρόνος</span>
              <span className="font-semibold text-white">
                {eta?.etaResult
                  ? formatETA(eta.etaResult.eta)
                  : order.estimated_delivery_eta
                    ? new Date(order.estimated_delivery_eta).toLocaleTimeString('el-GR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {telHref ? (
              <a
                href={telHref}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Κλήση πελάτη
              </a>
            ) : (
              <span className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-white/40">
                Χωρίς τηλέφωνο
              </span>
            )}

            {directionsUrl ? (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Navigation className="h-4 w-4" aria-hidden />
                Άνοιγμα πλοήγησης
              </a>
            ) : (
              <span className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-white/40">
                Χωρίς πλοήγηση
              </span>
            )}
          </div>

          <DriverOrderDetailsSection
            order={order}
            deliveryStage={stage}
            accordion
            hideAddressEta
            navigationEta={eta?.etaResult ? formatETA(eta.etaResult.eta) : null}
          />
        </div>
      )}

      {ENABLE_TRACKING_V2_DEBUG && (
        <TrackingV2DebugPanel
          surface="driver"
          assignmentId={activeDeliveryView.assignment?.id ?? null}
          driverLocation={driverLocation ?? null}
          destination={mapDestination}
          mapStatus="ready"
          lastRenderTime={null}
        />
      )}

      {stage && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-white/10 bg-black/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <DeliveryActions
            status={stage}
            onAction={onDeliveryAction}
            isPickingUp={isPickingUp}
            actionLoading={deliveryActionLoading}
            sticky
          />
        </div>
      )}
    </div>
  );
}
