/**
 * Single source of truth for driver active delivery state.
 * Stage derivation delegates to computeDeliveryState.
 */

import { computeDeliveryState } from '@/features/delivery/core/compute-delivery-state';
import { orderCoordinates } from '@/shared/utils/order-fields';
import { isValidLatLng } from '@/shared/utils/coordinates';
import type { Coordinates } from '@/shared/types/common.types';
import type { DriverOrderDetails } from '../types/driver-order.types';

export type DeliveryStage = 'assigned' | 'picked_up' | 'in_transit' | 'arrived';
export type DriverAvailability = 'online' | 'offline' | 'busy';

type OrderLike =
  | (Partial<DriverOrderDetails> & {
      coords?: { lat?: number; lng?: number } | Coordinates | null;
    })
  | null
  | undefined;

type AssignmentLike = {
  id?: string;
  order_id?: string;
  driver_id?: string;
  status?: string;
  assigned_at?: string | null;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  started_delivery_at?: string | null;
  arrived_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  order?: OrderLike;
} | null | undefined;

type DriverLike = { id?: string } | null | undefined;

export type ActiveDeliveryView = {
  isActive: boolean;
  stage: DeliveryStage | null;
  order: NonNullable<OrderLike> | null;
  assignment: NonNullable<AssignmentLike> | null;
};

const ACTIVE_STAGES = new Set<DeliveryStage>(['assigned', 'picked_up', 'in_transit', 'arrived']);

function deriveStage(
  order: OrderLike,
  assignment: NonNullable<AssignmentLike>
): DeliveryStage | null {
  const state = computeDeliveryState({ order, assignment, locations: [], role: 'driver' });
  if (!state.isDeliveryActive) return null;
  const stage = state.deliveryStatus;
  if (ACTIVE_STAGES.has(stage as DeliveryStage)) {
    return stage as DeliveryStage;
  }
  return 'assigned';
}

export function getActiveDelivery(
  _driver: DriverLike,
  order: OrderLike,
  assignment: AssignmentLike
): ActiveDeliveryView {
  if (!assignment?.id || assignment.delivered_at || assignment.cancelled_at) {
    return { isActive: false, stage: null, order: null, assignment: null };
  }

  const stage = deriveStage(order, assignment);
  if (!stage) {
    return { isActive: false, stage: null, order: null, assignment: null };
  }

  const resolvedOrder = (order ?? assignment.order ?? null) as NonNullable<OrderLike> | null;

  return {
    isActive: true,
    stage,
    order: resolvedOrder,
    assignment,
  };
}

export function resolveEffectiveAvailability(
  storeAvailability: string,
  deliveryUi: { isOnDelivery: boolean }
): DriverAvailability {
  if (deliveryUi.isOnDelivery) return 'busy';
  if (storeAvailability === 'offline') return 'offline';
  return 'online';
}

export function reconcileDriverStoreAvailability(
  storeAvailability: string,
  deliveryUi: { isOnDelivery: boolean },
  ctx: {
    loading: boolean;
    assignmentLoading: boolean;
    hasOptimistic: boolean;
    serverConfirmedNoActive: boolean;
  }
): DriverAvailability | null {
  if (ctx.loading || ctx.assignmentLoading) return null;

  if (deliveryUi.isOnDelivery && storeAvailability !== 'busy') {
    return 'busy';
  }

  if (
    !deliveryUi.isOnDelivery &&
    storeAvailability === 'busy' &&
    !ctx.hasOptimistic &&
    ctx.serverConfirmedNoActive
  ) {
    return 'online';
  }

  return null;
}

export function resolveActiveDeliveryDestination(view: ActiveDeliveryView): Coordinates | null {
  if (!view.isActive) return null;
  const coords = orderCoordinates(view.order);
  return isValidLatLng(coords) ? coords : null;
}

export function isNavigationGpsActive(view: ActiveDeliveryView): boolean {
  if (!view.isActive || !view.stage) return false;
  return view.stage === 'picked_up' || view.stage === 'in_transit' || view.stage === 'arrived';
}
