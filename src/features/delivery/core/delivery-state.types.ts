/**
 * Canonical delivery state types — single source of truth domain models.
 */

import type { CustomerOrderStep } from '@/shared/utils/customer-status';
import type { Coordinates } from '@/shared/types/common.types';

export type DeliveryLocationRow = {
  lat: number;
  lng: number;
  heading?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  recorded_at: string;
};

export type DeliveryStateOrder = {
  status?: string;
  delivery_status?: string;
  lat?: number | null;
  lng?: number | null;
  coords?: { lat?: number | null; lng?: number | null } | Coordinates | null;
  address?: string | null;
} | null;

export type DeliveryStateAssignment = {
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
} | null;

export type DeliveryStateRole = 'customer' | 'driver';

export type DriverPosition = {
  lat: number;
  lng: number;
  heading: number;
  recordedAt: string;
  speed?: number | null;
};

export type ComputedDeliveryState = {
  /** Canonical delivery lifecycle status. */
  deliveryStatus: string;
  /** Customer-facing journey step. */
  customerStep: CustomerOrderStep;
  /** Active delivery in progress (not delivered/cancelled). */
  isDeliveryActive: boolean;
  destination: Coordinates | null;
  driverPosition: DriverPosition | null;
  /** Chronologically sorted GPS trail — only during in_transit toward customer. */
  routePoints: { lat: number; lng: number; recordedAt: string }[];
  /** True when driver is en route to customer (in_transit lifecycle). */
  showDriverTrail: boolean;
  gpsReady: boolean;
};

export type ComputeDeliveryStateInput = {
  order?: DeliveryStateOrder;
  assignment?: DeliveryStateAssignment;
  locations?: DeliveryLocationRow[];
  role?: DeliveryStateRole;
  storeLocation?: Coordinates | null;
};
