/**
 * Single UI derivation for driver delivery — one selector, no scattered flags.
 */

import type { Coordinates } from '@/shared/types/common.types';
import {
  getActiveDelivery,
  resolveActiveDeliveryDestination,
  isNavigationGpsActive,
  resolveEffectiveAvailability,
  reconcileDriverStoreAvailability,
  type ActiveDeliveryView,
  type DeliveryStage,
  type DriverAvailability,
} from './active-delivery';

export type { ActiveDeliveryView, DeliveryStage, DriverAvailability };

export { getActiveDelivery, resolveActiveDeliveryDestination, reconcileDriverStoreAvailability };

export type PickupState = {
  permission: 'pending' | 'granted' | 'denied';
  gpsReady: boolean;
  isPickingUp: boolean;
};

export type DeliveryUiState = {
  isBusy: boolean;
  isOnDelivery: boolean;
  showMap: boolean;
  gpsActive: boolean;
  canTrackGps: boolean;
  destination: Coordinates | null;
  stage: DeliveryStage | null;
  deliveryStarted: boolean;
  availability: DriverAvailability;
};

export function selectDeliveryUi(
  activeView: ActiveDeliveryView,
  storeAvailability: string,
  pickup: PickupState
): DeliveryUiState {
  const isOnDelivery = activeView.isActive;
  const stage = activeView.stage;
  const gpsActive = isNavigationGpsActive(activeView);
  const destination = resolveActiveDeliveryDestination(activeView);

  return {
    isBusy: isOnDelivery,
    isOnDelivery,
    showMap: isOnDelivery,
    gpsActive,
    canTrackGps: isOnDelivery && pickup.permission !== 'denied' && !pickup.isPickingUp,
    destination,
    stage,
    deliveryStarted: stage !== null && stage !== 'assigned',
    availability: resolveEffectiveAvailability(storeAvailability, { isOnDelivery }),
  };
}
