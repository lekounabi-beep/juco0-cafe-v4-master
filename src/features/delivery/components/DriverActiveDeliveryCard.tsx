/**
 * Driver Active Delivery Card — map always mounts with fixed height (no conditional container).
 */

import { Navigation, Package, MapPin, Loader2 } from 'lucide-react';
import { TrackingMap } from '@/features/maps/components/TrackingMap';
import {
  useDriverMapSnapshot,
  useDriverTrackingDebug,
} from '@/features/maps/hooks/useDriverMapSnapshot';
import { formatDistance, formatETA } from '@/features/delivery/services/eta.service';
import { googleMapsConfig } from '@/integrations/google-maps/config';
import { DeliveryActions } from './DeliveryActions';
import type { useETA } from '../hooks/useETA';
import type { DeliveryUiState } from '../utils/delivery-ui-selector';
import type { ActiveDeliveryView } from '../utils/active-delivery';

interface DriverActiveDeliveryCardProps {
  activeDeliveryView: ActiveDeliveryView;
  deliveryUi: DeliveryUiState;
  mapDestination: { lat: number; lng: number } | null;
  destinationResolving?: boolean;
  onDeliveryAction: (action: string) => void;
  isPickingUp?: boolean;
  eta?: ReturnType<typeof useETA>;
}

export function DriverActiveDeliveryCard({
  activeDeliveryView,
  deliveryUi,
  mapDestination,
  destinationResolving = false,
  onDeliveryAction,
  isPickingUp = false,
  eta,
}: DriverActiveDeliveryCardProps) {
  const storeLocation = googleMapsConfig.defaultCenter;
  const { snapshotInput, hasDestination } = useDriverMapSnapshot({
    stage: deliveryUi.stage,
    destination: mapDestination,
    storeLocation,
  });
  const debug = useDriverTrackingDebug();
  const order = activeDeliveryView.order;
  const stage = deliveryUi.stage;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="relative h-[400px] min-h-[400px] w-full">
          <TrackingMap snapshotInput={snapshotInput} debug={debug} />
          {!hasDestination && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/50 px-6 text-center">
              <MapPin className="h-10 w-10 text-primary/70" />
              <p className="text-sm font-medium text-white/90">
                Αναμονή τοποθεσίας παραγγελίας...
              </p>
              {destinationResolving && (
                <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
              )}
            </div>
          )}
        </div>
        {eta?.etaResult && hasDestination && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Navigation className="h-4 w-4 text-primary" />
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

      <div className="rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-white">Ενεργή Παράδοση</h3>
        </div>

        {order && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Αριθμός Παραγγελίας</span>
              <span className="text-white font-semibold">#{order.order_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Διεύθυνση</span>
              <span className="text-white/60">{order.address}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Σύνολο</span>
              <span className="text-white font-semibold">{order.total?.toFixed(2)}€</span>
            </div>

            <div className="pt-3 border-t border-white/10">
              {stage && (
                <DeliveryActions
                  status={stage}
                  onAction={onDeliveryAction}
                  isPickingUp={isPickingUp}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
