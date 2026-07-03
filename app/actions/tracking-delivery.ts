"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveOrderTrackingAccess } from "@/lib/server/order-access.server";
import { requireDriverSession } from "./driver-login";
import { isUUID } from "@/shared/utils/uuid";
import { serverLog } from "@/lib/server/logger";

export type TrackingAssignmentRow = {
  id: string;
  order_id: string;
  driver_id: string;
  assigned_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  started_delivery_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

export type TrackingLocationRow = {
  id: string;
  delivery_assignment_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
};

export type TrackingDriverRow = {
  id: string;
  full_name: string;
  vehicle_type: string;
  phone: string;
  availability_status: string;
};

async function assertOrderTrackingAccess(orderId: string): Promise<boolean> {
  return resolveOrderTrackingAccess(orderId);
}

export async function getAssignmentForTrackingServer(
  orderId: string,
): Promise<TrackingAssignmentRow | null> {
  if (!(await assertOrderTrackingAccess(orderId))) {
    serverLog.warn("tracking.access.denied", { orderId, resource: "assignment" });
    return null;
  }

  const { data, error } = await supabaseAdmin.rpc("get_delivery_assignment_for_order", {
    p_order_id: orderId,
  });

  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  return (row as TrackingAssignmentRow) ?? null;
}

export async function getLatestLocationForTrackingServer(
  orderId: string,
  assignmentId: string,
): Promise<TrackingLocationRow | null> {
  if (!(await assertOrderTrackingAccess(orderId))) {
    serverLog.warn("tracking.access.denied", { orderId, resource: "location_latest" });
    return null;
  }

  if (!isUUID(assignmentId)) return null;

  const { data, error } = await supabaseAdmin.rpc("get_latest_delivery_location", {
    p_assignment_id: assignmentId,
  });

  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  return (row as TrackingLocationRow) ?? null;
}

export async function getLocationHistoryForTrackingServer(
  orderId: string,
  assignmentId: string,
): Promise<TrackingLocationRow[]> {
  if (!(await assertOrderTrackingAccess(orderId))) {
    serverLog.warn("tracking.access.denied", { orderId, resource: "location_history" });
    return [];
  }

  if (!isUUID(assignmentId)) return [];

  const { data, error } = await supabaseAdmin.rpc("get_delivery_location_history", {
    p_assignment_id: assignmentId,
  });

  if (error || !data) return [];

  const rows = Array.isArray(data) ? data : [data];
  return rows as TrackingLocationRow[];
}

export async function getDriverForTrackingServer(
  orderId: string,
  driverId: string,
): Promise<TrackingDriverRow | null> {
  if (!(await assertOrderTrackingAccess(orderId))) {
    serverLog.warn("tracking.access.denied", { orderId, resource: "driver" });
    return null;
  }

  if (!isUUID(driverId)) return null;

  const { data, error } = await supabaseAdmin
    .from("drivers")
    .select("id, full_name, vehicle_type, phone, availability_status")
    .eq("id", driverId)
    .maybeSingle();

  if (error || !data) return null;
  return data as TrackingDriverRow;
}

/** Driver GPS history — requires authenticated driver session owning the assignment. */
export async function getLocationHistoryForDriverServer(
  assignmentId: string,
): Promise<TrackingLocationRow[]> {
  const session = await requireDriverSession();

  if (!isUUID(assignmentId)) return [];

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from("delivery_assignments")
    .select("driver_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) return [];

  if (assignment.driver_id !== session.driverId) {
    serverLog.warn("tracking.access.denied", {
      driverId: session.driverId,
      resource: "driver_location_history",
    });
    return [];
  }

  const { data, error } = await supabaseAdmin.rpc("get_delivery_location_history", {
    p_assignment_id: assignmentId,
  });

  if (error || !data) return [];

  const rows = Array.isArray(data) ? data : [data];
  return rows as TrackingLocationRow[];
}
