"use server";

import { getOrderForTrackingServer } from "@app/actions/order-tracking";
import {
  getAssignmentForTrackingServer,
  getDriverForTrackingServer,
  getLatestLocationForTrackingServer,
  getLocationHistoryForTrackingServer,
  type TrackingAssignmentRow,
  type TrackingDriverRow,
  type TrackingLocationRow,
} from "@app/actions/tracking-delivery";
import { hasOrderAccess } from "@/lib/server/order-access.server";
import { isUUID } from "@/shared/utils/uuid";
import type {
  GetTrackingSessionOptions,
  TrackingSessionGpsMode,
  TrackingSessionGpsPayload,
  TrackingSessionPayload,
} from "@/features/tracking/types/tracking-session.types";
import type {
  TrackingAssignment,
  TrackingDriver,
  TrackingOrder,
} from "@/features/tracking/hooks/useCustomerTrackingSync";

function emptyGps(mode: TrackingSessionGpsMode = "none"): TrackingSessionGpsPayload {
  return {
    mode,
    latest: null,
    trail: [],
    serverTime: new Date().toISOString(),
  };
}

function toTrackingOrder(row: Record<string, unknown> | null): TrackingOrder | null {
  if (!row) return null;
  return row as unknown as TrackingOrder;
}

function toAssignment(row: TrackingAssignmentRow | null): TrackingAssignment | null {
  if (!row) return null;
  return row as unknown as TrackingAssignment;
}

function toDriver(row: TrackingDriverRow | null): TrackingDriver | null {
  if (!row) return null;
  return row as unknown as TrackingDriver;
}

function toDeliveryLocationRow(row: TrackingLocationRow): TrackingLocationRow {
  return row;
}

/**
 * Single customer tracking read — composes existing server actions.
 * Does NOT compute deliveryState (client pure derivation).
 */
export async function getTrackingSessionServer(
  orderId: string,
  options?: GetTrackingSessionOptions,
): Promise<TrackingSessionPayload | null> {
  if (!isUUID(orderId)) return null;

  const gpsMode: TrackingSessionGpsMode = options?.gpsMode ?? "none";

  const orderRow = await getOrderForTrackingServer(orderId);
  if (!orderRow) return null;

  const order = toTrackingOrder(orderRow);
  let assignment: TrackingAssignment | null = null;
  let driver: TrackingDriver | null = null;
  let gps = emptyGps(gpsMode);

  if (order?.driver_id) {
    const [assignmentRow, driverRow] = await Promise.all([
      getAssignmentForTrackingServer(orderId),
      getDriverForTrackingServer(orderId, order.driver_id),
    ]);
    assignment = toAssignment(assignmentRow);
    driver = toDriver(driverRow);

    if (assignment?.id && isUUID(assignment.id) && gpsMode !== "none") {
      if (gpsMode === "bootstrap") {
        const trail = await getLocationHistoryForTrackingServer(orderId, assignment.id);
        const parsedTrail = trail.map(toDeliveryLocationRow);
        const latest = parsedTrail.length > 0 ? parsedTrail[parsedTrail.length - 1]! : null;
        gps = {
          mode: "bootstrap",
          latest,
          trail: parsedTrail,
          serverTime: new Date().toISOString(),
        };
      } else if (gpsMode === "latest") {
        const latest = await getLatestLocationForTrackingServer(orderId, assignment.id);
        gps = {
          mode: "latest",
          latest,
          trail: latest ? [latest] : [],
          serverTime: new Date().toISOString(),
        };
      }
    }
  }

  return {
    order,
    assignment,
    driver,
    gps,
  };
}

/** Exposed for tests — verifies cookie state without changing security model. */
export async function getTrackingSessionAccess(orderId: string): Promise<boolean> {
  return hasOrderAccess(orderId);
}
