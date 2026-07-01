"use server";

import { isSuperAdminEnabled } from "@/features/superadmin/config/superadmin-flag";
import type {
  SuperAdminFleetDelivery,
  SuperAdminFleetDetailsResult,
  SuperAdminFleetDriver,
  SuperAdminFleetDriverDetails,
  SuperAdminFleetListResult,
  SuperAdminFleetLocation,
  SuperAdminFleetSummary,
} from "@/features/superadmin/types/superadmin-fleet.types";
import { buildAdminDriverSummary } from "@/features/admin/utils/admin-driver-state";
import { isGpsStale } from "@/features/superadmin/utils/operations-derivations";
import { isUUID } from "@/shared/utils/uuid";
import { ETACalculator } from "@/features/delivery/services/eta.service";
import { speedFromKmh } from "@/features/delivery/services/speed.service";
import type { TrailPoint } from "@/features/live-tracking-v2/utils/driver-trail-geojson";
import {
  FLEET_DRIVER_COLUMNS,
  fleetBuildActiveDelivery,
  fleetBuildListItem,
  fleetFetchActiveAssignmentsByDriver,
  fleetFetchLocationHistory,
  fleetFetchOrdersById,
  fleetIsGpsActive,
  fleetResolveDriverLocation,
  type FleetAssignmentRow,
  type FleetDriverRow,
  type FleetOrderRow,
} from "@/lib/server/fleet-read.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DRIVERS_TABLE = "drivers" as never;

function assertSuperAdminAccess(): void {
  if (!isSuperAdminEnabled()) {
    throw new Error("SuperAdmin is disabled");
  }
}

function toFleetDriver(item: ReturnType<typeof fleetBuildListItem>): SuperAdminFleetDriver {
  const hasCoords =
    item.current_location_lat != null && item.current_location_lng != null;
  const gpsAgeMs = item.last_location_update
    ? Date.now() - new Date(item.last_location_update).getTime()
    : null;

  return {
    ...item,
    gps_active: fleetIsGpsActive(item),
    gps_stale: isGpsStale(item.last_location_update),
    gps_age_ms: gpsAgeMs,
    no_gps: !hasCoords,
  };
}

function buildFleetSummary(drivers: SuperAdminFleetDriver[]): SuperAdminFleetSummary {
  const base = buildAdminDriverSummary(drivers);
  let lastFleetUpdate: string | null = null;

  for (const driver of drivers) {
    if (!driver.last_location_update) continue;
    if (!lastFleetUpdate || driver.last_location_update > lastFleetUpdate) {
      lastFleetUpdate = driver.last_location_update;
    }
  }

  return {
    ...base,
    gps_active: drivers.filter((d) => d.gps_active).length,
    gps_stale: drivers.filter((d) => d.gps_stale).length,
    no_gps: drivers.filter((d) => d.no_gps).length,
    last_fleet_update: lastFleetUpdate,
  };
}

function toFleetLocation(
  loc: Awaited<ReturnType<typeof fleetResolveDriverLocation>>,
): SuperAdminFleetLocation | null {
  if (!loc) return null;
  return {
    lat: loc.lat,
    lng: loc.lng,
    recorded_at: loc.recorded_at,
    source: loc.source,
    accuracy: loc.accuracy ?? null,
    speed: loc.speed ?? null,
    heading: loc.heading ?? null,
  };
}

function computeEtaMinutes(
  location: SuperAdminFleetLocation | null,
  delivery: SuperAdminFleetDelivery | null,
): number | null {
  if (!location || !delivery) return null;
  if (delivery.destination_lat == null || delivery.destination_lng == null) return null;

  const speedMs = location.speed != null && location.speed > 0 ? location.speed : speedFromKmh(25);

  const result = new ETACalculator().calculateETA(
    { lat: location.lat, lng: location.lng },
    { lat: delivery.destination_lat, lng: delivery.destination_lng },
    speedMs,
  );

  if (result.remainingTime <= 0) return null;
  return Math.max(1, Math.round(result.remainingTime / 60));
}

function toTrailPoints(rows: Awaited<ReturnType<typeof fleetFetchLocationHistory>>): TrailPoint[] {
  return rows
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
    .map((row) => ({
      lat: row.lat,
      lng: row.lng,
      recordedAt: row.recorded_at,
    }));
}

async function loadDriverContext(driverId: string): Promise<{
  driver: FleetDriverRow;
  assignment: FleetAssignmentRow | null;
  order: FleetOrderRow | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from(DRIVERS_TABLE)
    .select(FLEET_DRIVER_COLUMNS)
    .eq("id", driverId)
    .maybeSingle();

  if (error || !data) return null;

  const driver = data as FleetDriverRow;
  const assignmentsByDriver = await fleetFetchActiveAssignmentsByDriver([driver.id]);
  const assignment = assignmentsByDriver.get(driver.id) ?? null;
  const order = assignment
    ? await fleetFetchOrdersById([assignment.order_id]).then(
        (m) => m.get(assignment.order_id) ?? null,
      )
    : null;

  return { driver, assignment, order };
}

/** SuperAdmin fleet list — read-only, feature-flag gated. */
export async function getSuperAdminFleetList(): Promise<SuperAdminFleetListResult> {
  try {
    assertSuperAdminAccess();
  } catch {
    return { success: false, error: "SuperAdmin is disabled" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(DRIVERS_TABLE)
      .select(FLEET_DRIVER_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to load fleet drivers" };
    }

    const drivers = (data ?? []) as FleetDriverRow[];
    const driverIds = drivers.map((d) => d.id);
    const assignmentsByDriver = await fleetFetchActiveAssignmentsByDriver(driverIds);
    const orderIds = [...assignmentsByDriver.values()].map((a) => a.order_id);
    const ordersById = await fleetFetchOrdersById(orderIds);

    const list = drivers.map((driver) => {
      const assignment = assignmentsByDriver.get(driver.id) ?? null;
      const order = assignment ? (ordersById.get(assignment.order_id) ?? null) : null;
      return toFleetDriver(fleetBuildListItem(driver, assignment, order));
    });

    return {
      success: true,
      drivers: list,
      summary: buildFleetSummary(list),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load fleet",
    };
  }
}

/** SuperAdmin fleet driver details with GPS trail for active deliveries. */
export async function getSuperAdminFleetDriverDetails(
  driverId: string,
): Promise<SuperAdminFleetDetailsResult> {
  try {
    assertSuperAdminAccess();
  } catch {
    return { success: false, error: "SuperAdmin is disabled" };
  }

  if (!isUUID(driverId)) {
    return { success: false, error: "Invalid driver id" };
  }

  try {
    const context = await loadDriverContext(driverId);
    if (!context) {
      return { success: false, error: "Driver not found" };
    }

    const { driver, assignment, order } = context;
    const listItem = toFleetDriver(fleetBuildListItem(driver, assignment, order));
    const location = toFleetLocation(await fleetResolveDriverLocation(driver, assignment));

    let active_delivery: SuperAdminFleetDelivery | null = null;
    let route_points: TrailPoint[] = [];

    if (assignment && order) {
      const raw = fleetBuildActiveDelivery(assignment, order);
      active_delivery = {
        assignment_id: raw.assignment_id,
        order_id: raw.order_id,
        order_number: raw.order_number,
        customer_name: raw.customer_name,
        address: raw.address,
        status: raw.status,
        destination_lat: raw.destination_lat,
        destination_lng: raw.destination_lng,
        payment_method: raw.payment_method,
        order_delivery_status: raw.order_delivery_status,
        eta_minutes: null,
      };
      active_delivery.eta_minutes = computeEtaMinutes(location, active_delivery);

      if (raw.status === "in_transit" || raw.status === "picked_up") {
        route_points = toTrailPoints(await fleetFetchLocationHistory(assignment.id));
      }
    }

    const details: SuperAdminFleetDriverDetails = {
      ...listItem,
      location,
      active_delivery,
      route_points,
    };

    return { success: true, driver: details };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load driver details",
    };
  }
}
