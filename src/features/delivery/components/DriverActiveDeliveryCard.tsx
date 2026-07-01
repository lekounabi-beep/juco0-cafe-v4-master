/**
 * Driver Active Delivery Card — map always mounts with fixed height (no conditional container).
 */

import { useState, useEffect } from 'react';
import { Navigation, Package, MapPin, Loader2 } from 'lucide-react';
import { DriverLiveMap } from '@/features/live-tracking-v2/components/DriverLiveMap';
import { TrackingV2DebugPanel } from '@/features/live-tracking-v2/components/TrackingV2DebugPanel';
import { formatDistance, formatETA } from '@/features/delivery/services/eta.service';
import { DeliveryActions } from './DeliveryActions';
import { DriverOrderDetailsSection } from './DriverOrderDetailsSection';
import type { useETA } from '../hooks/useETA';
import type { DeliveryUiState } from '../utils/delivery-ui-selector';
import type { ActiveDeliveryView } from '../utils/active-delivery';
import type { DriverOrderDetails } from '../types/driver-order.types';

interface DriverActiveDeliveryCardProps {
  activeDeliveryView: ActiveDeliveryView;
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

export function DriverActiveDeliveryCard({
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
}: DriverActiveDeliveryCardProps) {
  const order = activeDeliveryView.order;
  const stage = deliveryUi.stage;
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lastRenderTime, setLastRenderTime] = useState<string | null>(null);

  useEffect(() => {
    setLastRenderTime(new Date().toISOString());
  }, [mapDestination, driverLocation, mapStatus, routePoints, showDriverTrail]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="relative h-[400px] min-h-[400px] w-full">
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
            onMapStatusChange={setMapStatus}
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
        {eta?.etaResult && hasDestination && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Navigation className="h-4 w-4 text-white/60" />
              <span>Πλοήγηση προς πελάτη</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{formatETA(eta.etaResult.eta)}</p>
              <p className="text-xs text-white/60">
                {formatDistance(eta.etaResult.remainingDistance)}
              </p>
            </div>
          </div>
        )}
      </div>

      <TrackingV2DebugPanel
        surface="driver"
        assignmentId={activeDeliveryView.assignment?.id ?? null}
        driverLocation={driverLocation ?? null}
        destination={mapDestination}
        mapStatus={mapStatus}
        lastRenderTime={lastRenderTime}
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-5 w-5 text-white/70" />
          <h3 className="font-semibold text-white">Ενεργή Παράδοση</h3>
        </div>

        {order && (
          <div className="space-y-3">
            <DriverOrderDetailsSection
              order={order as DriverOrderDetails}
              deliveryStage={stage}
            />

            <div className="pt-3 border-t border-white/10">
              {stage && (
                <DeliveryActions
                  status={stage}
                  onAction={onDeliveryAction}
                  isPickingUp={isPickingUp}
                  actionLoading={deliveryActionLoading}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
