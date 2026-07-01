"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildAdminDriverSummary,
  deriveAdminDriverOperationalState,
} from "@/features/admin/utils/admin-driver-state";
import type { AdminDriverOperationalState } from "@/features/admin/types/admin-driver.types";
import { isSuperAdminEnabled } from "@/features/superadmin/config/superadmin-flag";
import type {
  SuperAdminFeatureFlag,
  SuperAdminFleetHealthOverview,
  SuperAdminPlatformStats,
  SuperAdminStatsResult,
  SuperAdminStoreRow,
} from "@/features/superadmin/types/superadmin-stats.types";
import { isTrackingSessionEnabled } from "@/features/tracking/config/tracking-session-flag";
import {
  deriveLiveOrdersOverview,
  deriveOperationalAlerts,
  deriveOrderDurationAlerts,
  derivePaymentsOverview,
  derivePlatformHealth,
  derivePlatformInsights,
  isGpsStale,
  type OperationsDriverRow,
  type OperationsOrderRow,
} from "@/features/superadmin/utils/operations-derivations";

const PLATFORM_VERSION = "1.0.0";
const RECENT_ORDERS_LIMIT = 150;

const DRIVERS_TABLE = "drivers" as never;
const ORDERS_TABLE = "orders" as never;
const PROFILES_TABLE = "profiles" as never;
const PRODUCTS_TABLE = "products" as never;
const STORE_SETTINGS_TABLE = "store_settings" as never;
const ASSIGNMENTS_TABLE = "delivery_assignments" as never;

type DriverRow = {
  id: string;
  full_name: string;
  availability_status: string;
  is_active: boolean;
  last_location_update: string | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
};

type AssignmentRow = {
  driver_id: string;
  delivered_at: string | null;
  cancelled_at: string | null;
};

type ProductRow = {
  category: string;
};

type StoreInfoRow = {
  key: string;
  value: unknown;
};

function assertSuperAdminAccess(): void {
  if (!isSuperAdminEnabled()) {
    throw new Error("SuperAdmin is disabled");
  }
}

function buildFeatureFlags(): SuperAdminFeatureFlag[] {
  return [
    {
      key: "NEXT_PUBLIC_TRACKING_SESSION",
      label: "Tracking Session (V2)",
      enabled: isTrackingSessionEnabled(),
      source: "env",
      description: "Consolidated customer tracking session polling path",
    },
    {
      key: "NEXT_PUBLIC_TRACKING_DEBUG",
      label: "Tracking Debug Panel",
      enabled: process.env.NEXT_PUBLIC_TRACKING_DEBUG === "true",
      source: "env",
      description: "Live tracking V2 debug telemetry and panel",
    },
    {
      key: "NEXT_PUBLIC_MAP_PROVIDER",
      label: "Google Maps Provider",
      enabled: (process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "google") === "google",
      source: "env",
      description: "Map provider for geocoding fallback (google | mapbox)",
    },
    {
      key: "NEXT_PUBLIC_SUPERADMIN_ENABLED",
      label: "SuperAdmin Console",
      enabled: isSuperAdminEnabled(),
      source: "env",
      description: "Temporary gate for internal operations console",
    },
    {
      key: "driver_ux_v2",
      label: "Driver UX V2",
      enabled: false,
      source: "runtime",
      description: "Next-generation driver app experience — not yet implemented",
    },
    {
      key: "push_notifications",
      label: "Push Notifications",
      enabled: false,
      source: "runtime",
      description: "Web push for admin and customer alerts — not yet implemented",
    },
    {
      key: "experimental_ui",
      label: "Experimental UI",
      enabled: false,
      source: "runtime",
      description: "Experimental customer interface variants — not yet implemented",
    },
  ];
}

function integrationHealth() {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const hasMapbox = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
  const hasViva = Boolean(
    process.env.VIVA_CLIENT_ID && process.env.VIVA_CLIENT_SECRET && process.env.VIVA_SOURCE_CODE,
  );
  const hasGoogleMaps = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  return {
    supabase: hasSupabase,
    mapbox: hasMapbox,
    viva: hasViva,
    googleMaps: hasGoogleMaps,
  };
}

function extractSupabaseProject(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

async function countTable(
  table: never,
  filter?: (query: ReturnType<typeof supabaseAdmin.from>) => ReturnType<typeof supabaseAdmin.from>,
): Promise<number | null> {
  let query = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  if (filter) {
    query = filter(query);
  }
  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

async function fetchRecentOrders(): Promise<OperationsOrderRow[]> {
  const { data, error } = await supabaseAdmin
    .from(ORDERS_TABLE)
    .select(
      "id, order_number, status, delivery_status, payment_method, payment_status, customer_name, customer_phone, driver_id, created_at, total, items, viva_transaction_id",
    )
    .order("created_at", { ascending: false })
    .limit(RECENT_ORDERS_LIMIT);

  if (error || !data) return [];
  return data as OperationsOrderRow[];
}

async function fetchDriversWithAssignments(): Promise<{
  drivers: DriverRow[];
  activeAssignmentsByDriver: Map<string, boolean>;
}> {
  const { data: driversData, error: driversError } = await supabaseAdmin
    .from(DRIVERS_TABLE)
    .select(
      "id, full_name, availability_status, is_active, last_location_update, current_location_lat, current_location_lng",
    );

  if (driversError || !driversData) {
    return { drivers: [], activeAssignmentsByDriver: new Map() };
  }

  const drivers = driversData as DriverRow[];
  const driverIds = drivers.map((d) => d.id);
  const activeAssignmentsByDriver = new Map<string, boolean>();

  if (driverIds.length > 0) {
    const { data: assignmentsData } = await supabaseAdmin
      .from(ASSIGNMENTS_TABLE)
      .select("driver_id, delivered_at, cancelled_at")
      .in("driver_id", driverIds)
      .is("delivered_at", null)
      .is("cancelled_at", null);

    for (const row of (assignmentsData ?? []) as AssignmentRow[]) {
      activeAssignmentsByDriver.set(row.driver_id, true);
    }
  }

  return { drivers, activeAssignmentsByDriver };
}

async function fetchDriverSummary(
  drivers: DriverRow[],
  activeAssignmentsByDriver: Map<string, boolean>,
): Promise<SuperAdminPlatformStats["drivers"]> {
  const list = drivers.map((driver) => ({
    operational_state: deriveAdminDriverOperationalState({
      is_active: driver.is_active,
      availability_status: driver.availability_status,
      has_active_assignment: activeAssignmentsByDriver.has(driver.id),
    }) as AdminDriverOperationalState,
  }));

  return buildAdminDriverSummary(list);
}

function buildFleetHealthOverview(
  drivers: DriverRow[],
  activeAssignmentsByDriver: Map<string, boolean>,
): SuperAdminFleetHealthOverview {
  let online = 0;
  let offline = 0;
  let delivering = 0;
  let gpsStale = 0;
  let lastGpsReceived: string | null = null;

  for (const driver of drivers) {
    const state = deriveAdminDriverOperationalState({
      is_active: driver.is_active,
      availability_status: driver.availability_status,
      has_active_assignment: activeAssignmentsByDriver.has(driver.id),
    });

    if (state === "online") online += 1;
    if (state === "offline") offline += 1;
    if (state === "delivering") delivering += 1;

    if (isGpsStale(driver.last_location_update)) {
      gpsStale += 1;
    }

    if (driver.last_location_update) {
      if (!lastGpsReceived || driver.last_location_update > lastGpsReceived) {
        lastGpsReceived = driver.last_location_update;
      }
    }
  }

  return { online, offline, delivering, gpsStale, lastGpsReceived };
}

function toOperationsDrivers(
  drivers: DriverRow[],
  activeAssignmentsByDriver: Map<string, boolean>,
): OperationsDriverRow[] {
  return drivers.map((driver) => ({
    id: driver.id,
    full_name: driver.full_name,
    availability_status: driver.availability_status,
    is_active: driver.is_active,
    last_location_update: driver.last_location_update,
    current_location_lat: driver.current_location_lat,
    current_location_lng: driver.current_location_lng,
    has_active_assignment: activeAssignmentsByDriver.has(driver.id),
  }));
}

async function fetchStores(insights: ReturnType<typeof derivePlatformInsights>): Promise<SuperAdminStoreRow[]> {
  const { data, error } = await supabaseAdmin
    .from(STORE_SETTINGS_TABLE)
    .select("key, value")
    .eq("key", "store_info")
    .maybeSingle();

  if (error || !data) {
    return [];
  }

  const info = (data as StoreInfoRow).value;
  const record = info && typeof info === "object" ? (info as Record<string, unknown>) : {};
  const address = typeof record.address === "string" ? record.address : null;

  return [
    {
      id: "juco-primary",
      name: "Juco Coffee & Juice Bar",
      status: "active",
      address,
      ordersToday: insights.ordersToday,
      revenueToday: insights.revenueToday,
      driversActive: insights.driversUsedToday,
      lastActivity: new Date().toISOString(),
    },
  ];
}

async function fetchProductStats(): Promise<{ menuItems: number; categories: number }> {
  const { data, error } = await supabaseAdmin.from(PRODUCTS_TABLE).select("category");

  if (error || !data) {
    return { menuItems: 0, categories: 0 };
  }

  const products = data as ProductRow[];
  const categories = new Set(products.map((p) => p.category).filter(Boolean));

  return {
    menuItems: products.length,
    categories: categories.size,
  };
}

async function checkDatabaseHealth(): Promise<"healthy" | "unhealthy"> {
  const { error } = await supabaseAdmin.from(ORDERS_TABLE).select("id").limit(1);
  return error ? "unhealthy" : "healthy";
}

/** Read-only platform snapshot for SuperAdmin — gated by feature flag. */
export async function getSuperAdminPlatformStats(): Promise<SuperAdminStatsResult> {
  try {
    assertSuperAdminAccess();
  } catch {
    return { success: false, error: "SuperAdmin is disabled" };
  }

  try {
    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      customers,
      productStats,
      dbHealth,
      recentOrders,
      driverContext,
    ] = await Promise.all([
      countTable(ORDERS_TABLE),
      countTable(ORDERS_TABLE, (q) => q.eq("delivery_status", "delivered")),
      countTable(ORDERS_TABLE, (q) => q.or("status.eq.cancelled,delivery_status.eq.cancelled")),
      countTable(PROFILES_TABLE),
      fetchProductStats(),
      checkDatabaseHealth(),
      fetchRecentOrders(),
      fetchDriversWithAssignments(),
    ]);

    const { drivers, activeAssignmentsByDriver } = driverContext;
    const driverSummary = await fetchDriverSummary(drivers, activeAssignmentsByDriver);
    const integrations = integrationHealth();
    const environment = process.env.NODE_ENV ?? "development";
    const trackingEnabled = isTrackingSessionEnabled();
    const insights = derivePlatformInsights(recentOrders);
    const stores = await fetchStores(insights);
    const fleetHealth = buildFleetHealthOverview(drivers, activeAssignmentsByDriver);
    const operationsDrivers = toOperationsDrivers(drivers, activeAssignmentsByDriver);
    const databaseHealthy = dbHealth === "healthy";

    const platformHealth = derivePlatformHealth({
      databaseHealthy,
      integrations,
      trackingEnabled,
      driverTrackingAvailable: integrations.supabase && integrations.mapbox,
    });

    const alerts = deriveOperationalAlerts({
      orders: recentOrders,
      drivers: operationsDrivers,
      integrations,
      databaseHealthy,
    });

    const stats: SuperAdminPlatformStats = {
      storeCount: stores.length,
      activeStoreCount: stores.filter((s) => s.status === "active").length,
      totalOrders: totalOrders ?? 0,
      completedOrders: completedOrders ?? 0,
      cancelledOrders: cancelledOrders ?? 0,
      customers: customers ?? 0,
      drivers: driverSummary,
      menuItems: productStats.menuItems,
      categories: productStats.categories,
      stores,
      integrations,
      system: {
        database: dbHealth,
        api: "healthy",
        realtime: integrations.supabase ? "configured" : "unknown",
        payments: integrations.viva ? "configured" : "not_configured",
        mapbox: integrations.mapbox ? "configured" : "not_configured",
        gps: "available",
        offlineQueue: "client_only",
        backgroundJobs: "none",
        notifications: "in_app_only",
        build: PLATFORM_VERSION,
        version: PLATFORM_VERSION,
        environment,
        nodeVersion: process.version,
        nextVersion: "15.x",
        supabaseProject: extractSupabaseProject(),
        trackingEnabled,
        mapboxEnabled: integrations.mapbox,
      },
      featureFlags: buildFeatureFlags(),
      liveOrders: deriveLiveOrdersOverview(recentOrders),
      payments: derivePaymentsOverview(recentOrders),
      fleetHealth,
      platformHealth,
      alerts,
      durationAlerts: deriveOrderDurationAlerts(recentOrders),
      insights,
      fetchedAt: new Date().toISOString(),
    };

    return { success: true, stats };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load platform stats",
    };
  }
}
