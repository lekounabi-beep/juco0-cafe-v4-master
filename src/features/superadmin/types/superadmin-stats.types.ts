import type { AdminDriverSummary } from "@/features/admin/types/admin-driver.types";

export type SuperAdminIntegrationHealth = {
  supabase: boolean;
  mapbox: boolean;
  viva: boolean;
  googleMaps: boolean;
};

export type SuperAdminSystemHealth = {
  database: "healthy" | "unhealthy" | "unknown";
  api: "healthy" | "unknown";
  realtime: "configured" | "unknown";
  payments: "configured" | "not_configured";
  mapbox: "configured" | "not_configured";
  gps: "available" | "unknown";
  offlineQueue: "client_only" | "unknown";
  backgroundJobs: "none" | "unknown";
  notifications: "in_app_only" | "unknown";
  build: string;
  version: string;
  environment: string;
  nodeVersion: string;
  nextVersion: string;
  supabaseProject: string | null;
  trackingEnabled: boolean;
  mapboxEnabled: boolean;
};

export type SuperAdminFeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
  source: "env" | "runtime";
  description: string;
};

export type SuperAdminStoreRow = {
  id: string;
  name: string;
  status: "active" | "inactive";
  address: string | null;
  ordersToday?: number;
  revenueToday?: number;
  driversActive?: number;
  lastActivity?: string | null;
};

export type SuperAdminLiveOrdersOverview = {
  pending: number;
  preparing: number;
  ready: number;
  delivering: number;
  completedToday: number;
  cancelledToday: number;
};

export type SuperAdminPaymentsOverview = {
  cash: number;
  card: number;
  viva: number;
  failed: number;
  pending: number;
};

export type SuperAdminFleetHealthOverview = {
  online: number;
  offline: number;
  delivering: number;
  gpsStale: number;
  lastGpsReceived: string | null;
};

export type SuperAdminOperationalAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  titleKey: string;
  messageKey: string;
  messageValues?: Record<string, string | number>;
  entityType?: "order" | "driver" | "payment" | "system";
  entityId?: string;
  href?: string;
};

export type SuperAdminOrderDurationAlert = {
  orderId: string;
  orderNumber: string;
  stage: "preparing" | "ready" | "delivering";
  durationMinutes: number;
  thresholdMinutes: number;
};

export type SuperAdminPlatformInsights = {
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  revenueToday: number;
  revenueThisMonth: number;
  avgPreparationMinutes: number | null;
  avgDeliveryMinutes: number | null;
  peakHour: number | null;
  mostPopularProduct: string | null;
  driversUsedToday: number;
};

export type SuperAdminPlatformHealthCheck = {
  key: string;
  label: string;
  status: "ok" | "warning" | "error" | "unknown";
  message?: string;
};

export type SuperAdminPlatformHealth = {
  status: "healthy" | "warning" | "critical";
  checks: SuperAdminPlatformHealthCheck[];
};

export type SuperAdminPlatformStats = {
  storeCount: number;
  activeStoreCount: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  customers: number;
  drivers: AdminDriverSummary;
  menuItems: number;
  categories: number;
  stores: SuperAdminStoreRow[];
  integrations: SuperAdminIntegrationHealth;
  system: SuperAdminSystemHealth;
  featureFlags: SuperAdminFeatureFlag[];
  liveOrders: SuperAdminLiveOrdersOverview;
  payments: SuperAdminPaymentsOverview;
  fleetHealth: SuperAdminFleetHealthOverview;
  platformHealth: SuperAdminPlatformHealth;
  alerts: SuperAdminOperationalAlert[];
  durationAlerts: SuperAdminOrderDurationAlert[];
  insights: SuperAdminPlatformInsights;
  fetchedAt: string;
};

export type SuperAdminStatsResult =
  | { success: true; stats: SuperAdminPlatformStats }
  | { success: false; error: string };
