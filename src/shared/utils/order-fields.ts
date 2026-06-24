/**
 * Normalize order/delivery fields to match Supabase schema.
 */

import type { Coordinates } from '@/shared/types/common.types';
import { isValidLatLng, normalizeCoordinates } from '@/shared/utils/coordinates';

type OrderLocationFields = {
  lat?: number | string | null;
  lng?: number | string | null;
  address?: string | null;
  coords?: { lat?: number | string; lng?: number | string } | Coordinates | null;
};

type AssignmentTimestamps = {
  delivered_at?: string | null;
  arrived_at?: string | null;
  started_delivery_at?: string | null;
  picked_up_at?: string | null;
  accepted_at?: string | null;
  assigned_at?: string | null;
  cancelled_at?: string | null;
};

/** Read customer destination from orders.lat/lng (primary) or legacy orders.coords JSONB. */
export function orderCoordinates(order: OrderLocationFields | null | undefined): Coordinates | null {
  if (!order) return null;

  if (order.lat != null && order.lng != null) {
    const primary = normalizeCoordinates({ lat: order.lat, lng: order.lng });
    if (primary) return primary;
  }

  const coords = order.coords;
  if (coords?.lat != null && coords?.lng != null) {
    const legacy = normalizeCoordinates({ lat: coords.lat, lng: coords.lng });
    if (legacy) return legacy;
  }

  return null;
}

export { isValidLatLng };

/** Derive delivery status from delivery_assignments timestamp columns (no status column in DB). */
export function assignmentStatusFromTimestamps(
  assignment: AssignmentTimestamps | null | undefined
): string {
  if (!assignment) return 'pending';
  if (assignment.delivered_at) return 'delivered';
  if (assignment.arrived_at) return 'arrived';
  if (assignment.started_delivery_at) return 'in_transit';
  if (assignment.picked_up_at) return 'picked_up';
  if (assignment.accepted_at || assignment.assigned_at) return 'assigned';
  if (assignment.cancelled_at) return 'cancelled';
  return 'pending';
}
