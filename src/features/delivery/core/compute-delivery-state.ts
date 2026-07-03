/**
 * computeDeliveryState — THE ONLY place delivery status is derived.
 * Pure function: no side effects, no hooks, no Supabase clients.
 */

import { assignmentStatusFromTimestamps, orderCoordinates } from "@/shared/utils/order-fields";
import type { CustomerOrderStep } from "@/shared/utils/customer-status";
import type {
  ComputeDeliveryStateInput,
  ComputedDeliveryState,
  DeliveryLocationRow,
} from "./delivery-state.types";

const POST_PICKUP = new Set(["picked_up", "in_transit", "arrived"]);

function resolveDeliveryStatus(
  order: ComputeDeliveryStateInput["order"],
  assignment: ComputeDeliveryStateInput["assignment"],
): string {
  if (assignment?.cancelled_at) return "cancelled";
  if (assignment?.delivered_at) return "delivered";

  if (assignment) {
    return assignmentStatusFromTimestamps(assignment);
  }

  const orderStatus = order?.status ?? "pending";
  const deliveryStatus = order?.delivery_status;

  if (orderStatus === "cancelled" || deliveryStatus === "cancelled") return "cancelled";
  if (
    orderStatus === "delivered" ||
    orderStatus === "completed" ||
    deliveryStatus === "delivered"
  ) {
    return "delivered";
  }

  return deliveryStatus || orderStatus || "pending";
}

function resolveCustomerStep(orderStatus: string, deliveryStatus: string): CustomerOrderStep {
  const order = orderStatus || "pending";
  const delivery = deliveryStatus || "pending";

  if (order === "cancelled" || delivery === "cancelled") return "cancelled";
  if (delivery === "delivered" || order === "delivered" || order === "completed")
    return "delivered";
  if (POST_PICKUP.has(delivery) || delivery === "assigned") return "on_the_way";
  if (["assigned", "picked_up", "in_transit", "arrived"].includes(order)) return "on_the_way";
  if (order === "preparing" || order === "ready") return "preparing";
  if (order === "pending" || order === "accepted") return "received";
  return "received";
}

function sortLocationsByRecordedAt(locations: DeliveryLocationRow[]): DeliveryLocationRow[] {
  return [...locations].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );
}

function latestLocation(locations: DeliveryLocationRow[]): DeliveryLocationRow | null {
  const sorted = sortLocationsByRecordedAt(locations);
  return sorted.length > 0 ? sorted[sorted.length - 1]! : null;
}

function buildTrailPoints(
  deliveryStatus: string,
  locations: DeliveryLocationRow[],
  assignment: ComputeDeliveryStateInput["assignment"],
): { lat: number; lng: number; recordedAt: string }[] {
  if (deliveryStatus !== "in_transit") return [];

  const startedAt = assignment?.started_delivery_at;
  const startedMs = startedAt ? new Date(startedAt).getTime() : null;
  if (startedMs == null || !Number.isFinite(startedMs)) return [];

  const sorted = sortLocationsByRecordedAt(locations);
  const inTransitRows = sorted.filter((row) => new Date(row.recorded_at).getTime() >= startedMs);

  return inTransitRows.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    recordedAt: p.recorded_at,
  }));
}

function shouldShowDriverTrail(
  deliveryStatus: string,
  assignment: ComputeDeliveryStateInput["assignment"],
): boolean {
  if (deliveryStatus !== "in_transit") return false;
  if (assignment?.delivered_at || assignment?.cancelled_at) return false;
  return true;
}

function isDeliveryActive(
  deliveryStatus: string,
  assignment: ComputeDeliveryStateInput["assignment"],
): boolean {
  if (
    deliveryStatus === "delivered" ||
    deliveryStatus === "cancelled" ||
    deliveryStatus === "pending"
  ) {
    return false;
  }
  if (assignment?.delivered_at || assignment?.cancelled_at) return false;
  return POST_PICKUP.has(deliveryStatus) || deliveryStatus === "assigned";
}

/**
 * Single deterministic delivery state from order + assignment + canonical GPS rows.
 */
export function computeDeliveryState(input: ComputeDeliveryStateInput): ComputedDeliveryState {
  const order = input.order ?? null;
  const assignment = input.assignment ?? null;
  const locations = input.locations ?? [];

  const deliveryStatus = resolveDeliveryStatus(order, assignment);
  const orderStatus = order?.status ?? "pending";
  const customerStep = resolveCustomerStep(orderStatus, deliveryStatus);

  const destination = orderCoordinates(order as Parameters<typeof orderCoordinates>[0]);
  const latest = latestLocation(locations);
  const driverPosition = latest
    ? {
        lat: latest.lat,
        lng: latest.lng,
        heading: Number.isFinite(Number(latest.heading)) ? Number(latest.heading) : 0,
        recordedAt: latest.recorded_at,
        speed: latest.speed ?? null,
      }
    : null;

  const routePoints = buildTrailPoints(deliveryStatus, locations, assignment);
  const showDriverTrail = shouldShowDriverTrail(deliveryStatus, assignment);
  const gpsReady = driverPosition != null;
  const active = isDeliveryActive(deliveryStatus, assignment);

  return {
    deliveryStatus,
    customerStep,
    isDeliveryActive: active,
    destination,
    driverPosition,
    routePoints,
    showDriverTrail,
    gpsReady,
  };
}

/** Parse + validate a delivery_locations row. Returns null if invalid. */
export function parseDeliveryLocationRow(row: unknown): DeliveryLocationRow | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const recordedAt = record.recorded_at;
  if (typeof recordedAt !== "string" || !recordedAt) return null;

  const heading = Number(record.heading);
  const accuracy = Number(record.accuracy);
  const speed = Number(record.speed);

  return {
    lat,
    lng,
    recorded_at: recordedAt,
    heading: Number.isFinite(heading) ? heading : 0,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    speed: Number.isFinite(speed) ? speed : undefined,
  };
}

/** Monotonic guard — reject stale or duplicate GPS rows. */
export function shouldAcceptLocationRow(
  row: DeliveryLocationRow,
  lastRecordedAtMs: number | null,
): boolean {
  const t = new Date(row.recorded_at).getTime();
  if (!Number.isFinite(t)) return false;
  if (lastRecordedAtMs != null && t <= lastRecordedAtMs) return false;
  return true;
}
