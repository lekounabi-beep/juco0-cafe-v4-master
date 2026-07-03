import type { SuperAdminPlatformStats } from "@/features/superadmin/types/superadmin-stats.types";

/** Full stats fingerprint — skips re-renders when nothing material changed. */
export function superAdminStatsFingerprint(stats: SuperAdminPlatformStats): string {
  return JSON.stringify({
    liveOrders: stats.liveOrders,
    payments: stats.payments,
    fleetHealth: stats.fleetHealth,
    platformHealth: stats.platformHealth,
    alerts: stats.alerts.map((a) => `${a.id}:${a.severity}:${a.titleKey}`),
    durationAlerts: stats.durationAlerts.map((a) => `${a.orderId}:${a.stage}:${a.durationMinutes}`),
    insights: stats.insights,
    drivers: stats.drivers,
    totalOrders: stats.totalOrders,
    completedOrders: stats.completedOrders,
    cancelledOrders: stats.cancelledOrders,
    customers: stats.customers,
    stores: stats.stores,
    system: stats.system,
  });
}

/** Order-workspace slice — for pages that only display pipeline metrics. */
export function superAdminOrdersSliceFingerprint(stats: SuperAdminPlatformStats): string {
  return JSON.stringify({
    liveOrders: stats.liveOrders,
    completedOrders: stats.completedOrders,
    durationAlerts: stats.durationAlerts,
    orderAlerts: stats.alerts
      .filter((a) => a.entityType === "order")
      .map((a) => `${a.id}:${a.severity}:${a.titleKey}:${a.messageKey}`),
  });
}
