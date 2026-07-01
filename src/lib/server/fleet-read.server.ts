import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assignmentStatusFromTimestamps, orderCoordinates } from "@/shared/utils/order-fields";
import { deriveAdminDriverOperationalState } from "@/features/admin/utils/admin-driver-state";
import type {
  AdminDriverActiveDelivery,
  AdminDriverListItem,
  AdminDriverLocation,
} from "@/features/admin/types/admin-driver.types";

const DRIVERS_TABLE = "drivers" as never;
const ASSIGNMENTS_TABLE = "delivery_assignments" as never;
const ORDERS_TABLE = "orders" as never;

export const FLEET_DRIVER_COLUMNS =
  "id, full_name, username, phone, vehicle_type, availability_status, is_active, current_location_lat, current_location_lng, last_location_update, created_at";

export type FleetDriverRow = {
  id: string;
  full_name: string;
  username: string | null;
  phone: string | null;
  vehicle_type: string | null;
  availability_status: string;
  is_active: boolean;
  current_location_lat: number | null;
  current_location_lng: number | null;
  last_location_update: string | null;
  created_at: string;
};

export type FleetAssignmentRow = {
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

export type FleetOrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  address: string;
  payment_method: string | null;
  delivery_status: string | null;
  lat?: number | null;
  lng?: number | null;
  coords?: { lat?: number; lng?: number } | null;
};

export type FleetLocationRow = {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
};

type SupabaseRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export function fleetToNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function fleetProfileLocation(driver: FleetDriverRow): AdminDriverLocation | null {
  const lat = fleetToNumber(driver.current_location_lat);
  const lng = fleetToNumber(driver.current_location_lng);
  if (lat == null || lng == null) return null;

  return {
    lat,
    lng,
    recorded_at: driver.last_location_update ?? new Date(0).toISOString(),
    source: "profile",
  };
}

export async function fleetFetchActiveAssignmentsByDriver(
  driverIds: string[],
): Promise<Map<string, FleetAssignmentRow>> {
  const map = new Map<string, FleetAssignmentRow>();
  if (driverIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from(ASSIGNMENTS_TABLE)
    .select("*")
    .in("driver_id", driverIds)
    .is("delivered_at", null)
    .is("cancelled_at", null)
    .order("assigned_at", { ascending: false });

  if (error || !data) return map;

  for (const row of data as FleetAssignmentRow[]) {
    if (!map.has(row.driver_id)) {
      map.set(row.driver_id, row);
    }
  }

  return map;
}

export async function fleetFetchOrdersById(
  orderIds: string[],
): Promise<Map<string, FleetOrderRow>> {
  const map = new Map<string, FleetOrderRow>();
  if (orderIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from(ORDERS_TABLE)
    .select(
      "id, order_number, customer_name, address, payment_method, delivery_status, lat, lng, coords",
    )
    .in("id", orderIds);

  if (error || !data) return map;

  for (const row of data as FleetOrderRow[]) {
    map.set(row.id, row);
  }

  return map;
}

export function fleetBuildListItem(
  driver: FleetDriverRow,
  assignment: FleetAssignmentRow | null,
  order: FleetOrderRow | null,
): AdminDriverListItem & { phone: string | null; vehicle_type: string | null } {
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
    phone: driver.phone,
    vehicle_type: driver.vehicle_type,
    availability_status: driver.availability_status,
    is_active: driver.is_active,
    operational_state,
    last_location_update: driver.last_location_update,
    current_location_lat: fleetToNumber(driver.current_location_lat),
    current_location_lng: fleetToNumber(driver.current_location_lng),
    active_assignment_id: assignment?.id ?? null,
    active_order_number: order?.order_number ?? null,
    active_delivery_status: assignment ? assignmentStatusFromTimestamps(assignment) : null,
    created_at: driver.created_at,
  };
}

export async function fleetFetchLatestAssignmentLocation(
  assignmentId: string,
): Promise<(AdminDriverLocation & FleetLocationRow) | null> {
  const { data, error } = await (supabaseAdmin as unknown as SupabaseRpcClient).rpc(
    "get_latest_delivery_location",
    { p_assignment_id: assignmentId },
  );

  if (error || !data) return null;

  const row = (Array.isArray(data) ? data[0] : data) as FleetLocationRow | undefined;
  if (!row) return null;

  const lat = fleetToNumber(row.lat);
  const lng = fleetToNumber(row.lng);
  if (lat == null || lng == null) return null;

  return {
    lat,
    lng,
    recorded_at: row.recorded_at,
    source: "assignment",
    accuracy: fleetToNumber(row.accuracy),
    speed: fleetToNumber(row.speed),
    heading: fleetToNumber(row.heading),
  };
}

export async function fleetResolveDriverLocation(
  driver: FleetDriverRow,
  assignment: FleetAssignmentRow | null,
): Promise<(AdminDriverLocation & Partial<FleetLocationRow>) | null> {
  if (assignment?.id) {
    const assignmentLocation = await fleetFetchLatestAssignmentLocation(assignment.id);
    if (assignmentLocation) return assignmentLocation;
  }

  return fleetProfileLocation(driver);
}

export function fleetBuildActiveDelivery(
  assignment: FleetAssignmentRow,
  order: FleetOrderRow,
): AdminDriverActiveDelivery & {
  payment_method: string | null;
  order_delivery_status: string | null;
} {
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
    payment_method: order.payment_method,
    order_delivery_status: order.delivery_status,
  };
}

export async function fleetFetchLocationHistory(assignmentId: string): Promise<FleetLocationRow[]> {
  const { data, error } = await (supabaseAdmin as unknown as SupabaseRpcClient).rpc(
    "get_delivery_location_history",
    { p_assignment_id: assignmentId },
  );

  if (error || !data) return [];

  const rows = Array.isArray(data) ? data : [data];
  return rows as FleetLocationRow[];
}

export const GPS_ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

export function fleetIsGpsActive(
  driver: Pick<
    AdminDriverListItem,
    "last_location_update" | "current_location_lat" | "current_location_lng"
  >,
): boolean {
  if (driver.current_location_lat == null || driver.current_location_lng == null) return false;
  if (!driver.last_location_update) return false;
  const age = Date.now() - new Date(driver.last_location_update).getTime();
  return age <= GPS_ACTIVE_THRESHOLD_MS;
}
