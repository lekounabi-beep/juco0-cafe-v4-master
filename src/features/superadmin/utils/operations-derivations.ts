import {
  getAdminOrderColumn,
  type AdminOrderColumnId,
} from "@/features/admin/utils/admin-order-columns";
import type {
  SuperAdminIntegrationHealth,
  SuperAdminLiveOrdersOverview,
  SuperAdminOperationalAlert,
  SuperAdminOrderDurationAlert,
  SuperAdminPaymentsOverview,
  SuperAdminPlatformHealth,
  SuperAdminPlatformInsights,
} from "@/features/superadmin/types/superadmin-stats.types";
import {
  ORDER_DURATION_THRESHOLDS_MIN,
  ORDER_WAITING_THRESHOLD_MIN,
  SUPERADMIN_GPS_STALE_MS,
} from "@/features/superadmin/utils/operations-constants";

export type OperationsOrderRow = {
  id: string;
  order_number: string;
  status: string;
  delivery_status: string;
  payment_method: string;
  payment_status: string;
  customer_phone: string;
  customer_name: string;
  driver_id: string | null;
  created_at: string;
  total: number;
  items: { name: string; qty: number; price: number }[];
  viva_transaction_id?: string | null;
};

export type OperationsDriverRow = {
  id: string;
  full_name: string;
  availability_status: string;
  is_active: boolean;
  last_location_update: string | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
  has_active_assignment: boolean;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

function isOnOrAfter(iso: string, boundary: Date): boolean {
  return new Date(iso).getTime() >= boundary.getTime();
}

function minutesSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
}

function isTerminalOrder(order: OperationsOrderRow): boolean {
  return (
    order.delivery_status === "delivered" ||
    order.delivery_status === "completed" ||
    order.delivery_status === "cancelled" ||
    order.status === "cancelled"
  );
}

export function deriveLiveOrdersOverview(orders: OperationsOrderRow[]): SuperAdminLiveOrdersOverview {
  const today = startOfToday();
  const counts: Record<AdminOrderColumnId, number> = {
    incoming: 0,
    preparing: 0,
    ready: 0,
    on_delivery: 0,
    completed: 0,
  };

  let completedToday = 0;
  let cancelledToday = 0;

  for (const order of orders) {
    const column = getAdminOrderColumn(order.status, order.delivery_status);
    if (!isTerminalOrder(order)) {
      counts[column] += 1;
    }

    if (isOnOrAfter(order.created_at, today)) {
      if (order.delivery_status === "delivered" || order.delivery_status === "completed") {
        completedToday += 1;
      }
      if (order.status === "cancelled" || order.delivery_status === "cancelled") {
        cancelledToday += 1;
      }
    }
  }

  return {
    pending: counts.incoming,
    preparing: counts.preparing,
    ready: counts.ready,
    delivering: counts.on_delivery,
    completedToday,
    cancelledToday,
  };
}

export function derivePaymentsOverview(orders: OperationsOrderRow[]): SuperAdminPaymentsOverview {
  let cash = 0;
  let card = 0;
  let viva = 0;
  let failed = 0;
  let pending = 0;

  for (const order of orders) {
    if (order.payment_method === "cod") cash += 1;
    if (order.payment_method === "card") {
      card += 1;
      if (order.viva_transaction_id) viva += 1;
    }
    if (order.payment_status === "failed") failed += 1;
    if (order.payment_status === "pending") pending += 1;
  }

  return { cash, card, viva, failed, pending };
}

export function derivePlatformInsights(orders: OperationsOrderRow[]): SuperAdminPlatformInsights {
  const today = startOfToday();
  const week = startOfWeek();
  const month = startOfMonth();

  let ordersToday = 0;
  let ordersThisWeek = 0;
  let ordersThisMonth = 0;
  let revenueToday = 0;
  let revenueThisMonth = 0;
  const hourCounts = new Map<number, number>();
  const productCounts = new Map<string, number>();
  const driversToday = new Set<string>();

  for (const order of orders) {
    const created = new Date(order.created_at);
    if (isOnOrAfter(order.created_at, today)) {
      ordersToday += 1;
      if (order.payment_status === "paid") revenueToday += order.total;
      if (order.driver_id) driversToday.add(order.driver_id);
    }
    if (isOnOrAfter(order.created_at, week)) ordersThisWeek += 1;
    if (isOnOrAfter(order.created_at, month)) {
      ordersThisMonth += 1;
      if (order.payment_status === "paid") revenueThisMonth += order.total;
    }

    hourCounts.set(created.getHours(), (hourCounts.get(created.getHours()) ?? 0) + 1);
    for (const item of order.items ?? []) {
      productCounts.set(item.name, (productCounts.get(item.name) ?? 0) + item.qty);
    }
  }

  let peakHour: number | null = null;
  let peakCount = 0;
  for (const [hour, count] of hourCounts) {
    if (count > peakCount) {
      peakCount = count;
      peakHour = hour;
    }
  }

  let mostPopularProduct: string | null = null;
  let topQty = 0;
  for (const [name, qty] of productCounts) {
    if (qty > topQty) {
      topQty = qty;
      mostPopularProduct = name;
    }
  }

  return {
    ordersToday,
    ordersThisWeek,
    ordersThisMonth,
    revenueToday: Math.round(revenueToday * 100) / 100,
    revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
    avgPreparationMinutes: null,
    avgDeliveryMinutes: null,
    peakHour,
    mostPopularProduct,
    driversUsedToday: driversToday.size,
  };
}

export function deriveOrderDurationAlerts(
  orders: OperationsOrderRow[],
  now = Date.now(),
): SuperAdminOrderDurationAlert[] {
  const alerts: SuperAdminOrderDurationAlert[] = [];

  for (const order of orders) {
    if (isTerminalOrder(order)) continue;

    const column = getAdminOrderColumn(order.status, order.delivery_status);
    const ageMin = minutesSince(order.created_at, now);

    if (column === "preparing" && ageMin > ORDER_DURATION_THRESHOLDS_MIN.preparing) {
      alerts.push({
        orderId: order.id,
        orderNumber: order.order_number,
        stage: "preparing",
        durationMinutes: ageMin,
        thresholdMinutes: ORDER_DURATION_THRESHOLDS_MIN.preparing,
      });
    }

    if (column === "ready" && ageMin > ORDER_DURATION_THRESHOLDS_MIN.ready) {
      alerts.push({
        orderId: order.id,
        orderNumber: order.order_number,
        stage: "ready",
        durationMinutes: ageMin,
        thresholdMinutes: ORDER_DURATION_THRESHOLDS_MIN.ready,
      });
    }

    if (column === "on_delivery" && ageMin > ORDER_DURATION_THRESHOLDS_MIN.delivering) {
      alerts.push({
        orderId: order.id,
        orderNumber: order.order_number,
        stage: "delivering",
        durationMinutes: ageMin,
        thresholdMinutes: ORDER_DURATION_THRESHOLDS_MIN.delivering,
      });
    }
  }

  return alerts.sort((a, b) => b.durationMinutes - a.durationMinutes);
}

export function isGpsStale(lastUpdate: string | null, now = Date.now()): boolean {
  if (!lastUpdate) return true;
  return now - new Date(lastUpdate).getTime() > SUPERADMIN_GPS_STALE_MS;
}

export function deriveOperationalAlerts(input: {
  orders: OperationsOrderRow[];
  drivers: OperationsDriverRow[];
  integrations: SuperAdminIntegrationHealth;
  databaseHealthy: boolean;
  now?: number;
}): SuperAdminOperationalAlert[] {
  const { orders, drivers, integrations, databaseHealthy, now = Date.now() } = input;
  const alerts: SuperAdminOperationalAlert[] = [];

  if (!databaseHealthy) {
    alerts.push({
      id: "db-unhealthy",
      severity: "critical",
      titleKey: "alert.db_unhealthy.title",
      messageKey: "alert.db_unhealthy.message",
      entityType: "system",
      href: "/superadmin/system",
    });
  }

  if (!integrations.mapbox) {
    alerts.push({
      id: "mapbox-missing",
      severity: "warning",
      titleKey: "alert.mapbox_missing.title",
      messageKey: "alert.mapbox_missing.message",
      entityType: "system",
      href: "/superadmin/system",
    });
  }

  if (!integrations.viva) {
    alerts.push({
      id: "viva-missing",
      severity: "info",
      titleKey: "alert.viva_missing.title",
      messageKey: "alert.viva_missing.message",
      entityType: "system",
      href: "/superadmin/payments",
    });
  }

  for (const order of orders) {
    if (order.payment_status === "failed") {
      alerts.push({
        id: `payment-failed-${order.id}`,
        severity: "critical",
        titleKey: "alert.payment_failed.title",
        messageKey: "alert.payment_failed.message",
        messageValues: {
          orderNumber: order.order_number,
          customer: order.customer_name,
          method: order.payment_method,
        },
        entityType: "payment",
        entityId: order.id,
        href: "/superadmin/payments",
      });
    }

    if (!order.customer_phone?.trim()) {
      alerts.push({
        id: `missing-phone-${order.id}`,
        severity: "warning",
        titleKey: "alert.missing_phone.title",
        messageKey: "alert.missing_phone.message",
        messageValues: {
          orderNumber: order.order_number,
          customer: order.customer_name,
        },
        entityType: "order",
        entityId: order.id,
        href: "/superadmin/orders",
      });
    }

    const column = getAdminOrderColumn(order.status, order.delivery_status);
    if (
      (column === "ready" || column === "on_delivery") &&
      !order.driver_id &&
      minutesSince(order.created_at, now) > ORDER_WAITING_THRESHOLD_MIN
    ) {
      alerts.push({
        id: `missing-driver-${order.id}`,
        severity: "warning",
        titleKey: "alert.missing_driver.title",
        messageKey: "alert.missing_driver.message",
        messageValues: {
          orderNumber: order.order_number,
          minutes: minutesSince(order.created_at, now),
        },
        entityType: "order",
        entityId: order.id,
        href: "/superadmin/orders",
      });
    }

    if (column === "incoming" && minutesSince(order.created_at, now) > ORDER_WAITING_THRESHOLD_MIN) {
      alerts.push({
        id: `order-waiting-${order.id}`,
        severity: "warning",
        titleKey: "alert.order_waiting.title",
        messageKey: "alert.order_waiting.message",
        messageValues: {
          orderNumber: order.order_number,
          minutes: minutesSince(order.created_at, now),
        },
        entityType: "order",
        entityId: order.id,
        href: "/superadmin/orders",
      });
    }
  }

  for (const driver of drivers) {
    if (driver.has_active_assignment && driver.availability_status === "offline") {
      alerts.push({
        id: `driver-offline-delivery-${driver.id}`,
        severity: "critical",
        titleKey: "alert.driver_offline.title",
        messageKey: "alert.driver_offline.message",
        messageValues: { driver: driver.full_name },
        entityType: "driver",
        entityId: driver.id,
        href: "/superadmin/drivers",
      });
    }

    if (
      driver.has_active_assignment &&
      isGpsStale(driver.last_location_update, now)
    ) {
      alerts.push({
        id: `gps-stale-${driver.id}`,
        severity: "warning",
        titleKey: "alert.gps_stale.title",
        messageKey: driver.last_location_update
          ? "alert.gps_stale.message"
          : "alert.gps_stale_none.message",
        messageValues: driver.last_location_update
          ? {
              driver: driver.full_name,
              minutes: minutesSince(driver.last_location_update, now),
            }
          : { driver: driver.full_name },
        entityType: "driver",
        entityId: driver.id,
        href: "/superadmin/drivers",
      });
    }
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

export function derivePlatformHealth(input: {
  databaseHealthy: boolean;
  integrations: SuperAdminIntegrationHealth;
  trackingEnabled: boolean;
  driverTrackingAvailable: boolean;
}): SuperAdminPlatformHealth {
  const checks: SuperAdminPlatformHealth["checks"] = [
    {
      key: "database",
      label: "Database",
      status: input.databaseHealthy ? "ok" : "error",
    },
    {
      key: "supabase",
      label: "Supabase",
      status: input.integrations.supabase ? "ok" : "error",
    },
    {
      key: "realtime",
      label: "Realtime",
      status: input.integrations.supabase ? "ok" : "unknown",
      message: input.integrations.supabase ? "Configured" : "Not configured",
    },
    {
      key: "payments",
      label: "Payments",
      status: input.integrations.viva ? "ok" : "warning",
      message: input.integrations.viva ? "Viva configured" : "Viva not configured",
    },
    {
      key: "mapbox",
      label: "Mapbox",
      status: input.integrations.mapbox ? "ok" : "warning",
      message: input.integrations.mapbox ? "Configured" : "Token missing",
    },
    {
      key: "tracking",
      label: "Driver Tracking",
      status: input.trackingEnabled && input.driverTrackingAvailable ? "ok" : "warning",
      message: input.trackingEnabled ? "Tracking session enabled" : "Tracking session disabled",
    },
  ];

  const hasError = checks.some((c) => c.status === "error");
  const hasWarning = checks.some((c) => c.status === "warning");

  return {
    status: hasError ? "critical" : hasWarning ? "warning" : "healthy",
    checks,
  };
}
