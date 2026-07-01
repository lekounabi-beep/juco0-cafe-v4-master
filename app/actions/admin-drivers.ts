"use server";

import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "./admin-auth";
import { isUUID } from "@/shared/utils/uuid";
import { assignmentStatusFromTimestamps, orderCoordinates } from "@/shared/utils/order-fields";
import {
  buildAdminDriverSummary,
  deriveAdminDriverOperationalState,
} from "@/features/admin/utils/admin-driver-state";
import type {
  AdminDriverActiveDelivery,
  AdminDriverDetails,
  AdminDriverDetailsResult,
  AdminDriverListItem,
  AdminDriverLocation,
  AdminDriverMutationResult,
  AdminDriversListResult,
} from "@/features/admin/types/admin-driver.types";
import { serverLog } from "@/lib/server/logger";

const BCRYPT_ROUNDS = 12;
const DRIVERS_TABLE = "drivers" as never;
const ASSIGNMENTS_TABLE = "delivery_assignments" as never;
const ORDERS_TABLE = "orders" as never;

const DRIVER_LIST_COLUMNS =
  "id, full_name, username, availability_status, is_active, current_location_lat, current_location_lng, last_location_update, created_at";

type DriverRow = {
  id: string;
  full_name: string;
  username: string | null;
  availability_status: string;
  is_active: boolean;
  current_location_lat: number | null;
  current_location_lng: number | null;
  last_location_update: string | null;
  created_at: string;
};

type AssignmentRow = {
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

type OrderSummaryRow = {
  id: string;
  order_number: string;
  customer_name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  coords?: { lat?: number; lng?: number } | null;
};

type TrackingLocationRow = {
  lat: number;
  lng: number;
  recorded_at: string;
};

type SupabaseRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

async function requireAdmin(): Promise<void> {
  try {
    await requireAdminSession();
  } catch {
    throw new Error("Unauthorized — sign in again at /admin/login");
  }
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function profileLocation(driver: DriverRow): AdminDriverLocation | null {
  const lat = toNumber(driver.current_location_lat);
  const lng = toNumber(driver.current_location_lng);
  if (lat == null || lng == null) return null;

  return {
    lat,
    lng,
    recorded_at: driver.last_location_update ?? new Date(0).toISOString(),
    source: "profile",
  };
}

async function fetchActiveAssignmentsByDriver(
  driverIds: string[],
): Promise<Map<string, AssignmentRow>> {
  const map = new Map<string, AssignmentRow>();
  if (driverIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from(ASSIGNMENTS_TABLE)
    .select("*")
    .in("driver_id", driverIds)
    .is("delivered_at", null)
    .is("cancelled_at", null)
    .order("assigned_at", { ascending: false });

  if (error || !data) return map;

  for (const row of data as AssignmentRow[]) {
    if (!map.has(row.driver_id)) {
      map.set(row.driver_id, row);
    }
  }

  return map;
}

async function fetchOrdersById(orderIds: string[]): Promise<Map<string, OrderSummaryRow>> {
  const map = new Map<string, OrderSummaryRow>();
  if (orderIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from(ORDERS_TABLE)
    .select("id, order_number, customer_name, address, lat, lng, coords")
    .in("id", orderIds);

  if (error || !data) return map;

  for (const row of data as OrderSummaryRow[]) {
    map.set(row.id, row);
  }

  return map;
}

function buildListItem(
  driver: DriverRow,
  assignment: AssignmentRow | null,
  order: OrderSummaryRow | null,
): AdminDriverListItem {
  const hasActiveAssignment = Boolean(assignment?.id);
  const operational_state = deriveAdminDriverOperationalState({
    is_active: driver.is_active,
    availability_status: driver.availability_status,
    has_active_assignment: hasActiveAssignment,
  });

  return {
    id: driver.id,
    full_name: driver.full_name,
    username: driver.username ?? "",
    availability_status: driver.availability_status,
    is_active: driver.is_active,
    operational_state,
    last_location_update: driver.last_location_update,
    current_location_lat: toNumber(driver.current_location_lat),
    current_location_lng: toNumber(driver.current_location_lng),
    active_assignment_id: assignment?.id ?? null,
    active_order_number: order?.order_number ?? null,
    active_delivery_status: assignment ? assignmentStatusFromTimestamps(assignment) : null,
    created_at: driver.created_at,
  };
}

async function fetchLatestAssignmentLocation(
  assignmentId: string,
): Promise<AdminDriverLocation | null> {
  const { data, error } = await (supabaseAdmin as unknown as SupabaseRpcClient).rpc(
    "get_latest_delivery_location",
    { p_assignment_id: assignmentId },
  );

  if (error || !data) return null;

  const row = (Array.isArray(data) ? data[0] : data) as TrackingLocationRow | undefined;
  if (!row) return null;

  const lat = toNumber(row.lat);
  const lng = toNumber(row.lng);
  if (lat == null || lng == null) return null;

  return {
    lat,
    lng,
    recorded_at: row.recorded_at,
    source: "assignment",
  };
}

async function resolveDriverLocation(
  driver: DriverRow,
  assignment: AssignmentRow | null,
): Promise<AdminDriverLocation | null> {
  if (assignment?.id) {
    const assignmentLocation = await fetchLatestAssignmentLocation(assignment.id);
    if (assignmentLocation) return assignmentLocation;
  }

  return profileLocation(driver);
}

function buildActiveDelivery(
  assignment: AssignmentRow,
  order: OrderSummaryRow,
): AdminDriverActiveDelivery {
  const destination = orderCoordinates(order);

  return {
    assignment_id: assignment.id,
    order_id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    address: order.address,
    status: assignmentStatusFromTimestamps(assignment),
    destination_lat: destination?.lat ?? null,
    destination_lng: destination?.lng ?? null,
  };
}

/** Server-authoritative admin driver list — bypasses RLS via service role. */
export async function getAdminDriversList(): Promise<AdminDriversListResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unauthorized",
    };
  }

  const { data, error } = await supabaseAdmin
    .from(DRIVERS_TABLE)
    .select(DRIVER_LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    serverLog.warn("driver.orders.fetch_failed", { context: "admin_drivers_list" });
    return { success: false, error: "Failed to load drivers" };
  }

  const drivers = (data ?? []) as DriverRow[];
  const driverIds = drivers.map((d) => d.id);
  const assignmentsByDriver = await fetchActiveAssignmentsByDriver(driverIds);
  const orderIds = [...assignmentsByDriver.values()].map((a) => a.order_id);
  const ordersById = await fetchOrdersById(orderIds);

  const list = drivers.map((driver) => {
    const assignment = assignmentsByDriver.get(driver.id) ?? null;
    const order = assignment ? (ordersById.get(assignment.order_id) ?? null) : null;
    return buildListItem(driver, assignment, order);
  });

  return {
    success: true,
    drivers: list,
    summary: buildAdminDriverSummary(list),
  };
}

export async function getAdminDriverDetails(driverId: string): Promise<AdminDriverDetailsResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unauthorized",
    };
  }

  if (!isUUID(driverId)) {
    return { success: false, error: "Invalid driver id" };
  }

  const { data, error } = await supabaseAdmin
    .from(DRIVERS_TABLE)
    .select(DRIVER_LIST_COLUMNS)
    .eq("id", driverId)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Driver not found" };
  }

  const driver = data as DriverRow;
  const assignmentsByDriver = await fetchActiveAssignmentsByDriver([driver.id]);
  const assignment = assignmentsByDriver.get(driver.id) ?? null;
  const order = assignment
    ? await fetchOrdersById([assignment.order_id]).then((m) => m.get(assignment.order_id) ?? null)
    : null;

  const listItem = buildListItem(driver, assignment, order);
  const location = await resolveDriverLocation(driver, assignment);
  const active_delivery = assignment && order ? buildActiveDelivery(assignment, order) : null;

  const details: AdminDriverDetails = {
    ...listItem,
    location,
    active_delivery,
  };

  return { success: true, driver: details };
}

export async function updateAdminDriver(
  driverId: string,
  payload: { full_name?: string; password?: string },
): Promise<AdminDriverMutationResult> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  if (!isUUID(driverId)) {
    return { success: false, error: "Invalid driver id" };
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.full_name !== undefined) {
    const fullName = payload.full_name.trim();
    if (!fullName) {
      return { success: false, error: "Το όνομα είναι υποχρεωτικό." };
    }
    update.full_name = fullName;
  }

  if (payload.password !== undefined) {
    if (payload.password.length < 1) {
      return { success: false, error: "Ο κωδικός είναι υποχρεωτικός." };
    }
    update.password_hash = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);
  }

  if (Object.keys(update).length === 1) {
    return { success: false, error: "No changes to save" };
  }

  const { error } = await supabaseAdmin
    .from(DRIVERS_TABLE)
    .update(update as never)
    .eq("id", driverId);

  if (error) {
    return { success: false, error: "Failed to update driver" };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function setAdminDriverActive(
  driverId: string,
  isActive: boolean,
): Promise<AdminDriverMutationResult> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  if (!isUUID(driverId)) {
    return { success: false, error: "Invalid driver id" };
  }

  const { error } = await supabaseAdmin
    .from(DRIVERS_TABLE)
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
      ...(isActive ? {} : { availability_status: "offline" }),
    } as never)
    .eq("id", driverId);

  if (error) {
    return { success: false, error: "Failed to update driver status" };
  }

  revalidatePath("/admin");
  return { success: true };
}
