"use client";

import {
  Ban,
  CheckCircle2,
  FolderTree,
  LayoutGrid,
  Package,
  Radio,
  Receipt,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { MetricCard } from "@/features/superadmin/components/overview/MetricCard";
import type { SuperAdminPlatformStats } from "@/features/superadmin/types/superadmin-stats.types";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export function OverviewMetricsGrid({
  stats,
  loading,
}: {
  stats: SuperAdminPlatformStats | null;
  loading: boolean;
}) {
  const { t } = useSuperAdminT();
  const peakHour =
    stats?.insights.peakHour != null ? `${stats.insights.peakHour}:00` : undefined;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <MetricCard
        label={t("metrics.totalStores")}
        value={stats?.storeCount}
        icon={Store}
        loading={loading}
        hint={t("metrics.hint.storeInstances")}
      />
      <MetricCard
        label={t("metrics.activeStores")}
        value={stats?.activeStoreCount}
        icon={Store}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.ordersToday")}
        value={stats?.insights.ordersToday}
        icon={Receipt}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.ordersWeek")}
        value={stats?.insights.ordersThisWeek}
        icon={Receipt}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.ordersMonth")}
        value={stats?.insights.ordersThisMonth}
        icon={Receipt}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.revenueToday")}
        value={stats?.insights.revenueToday != null ? `€${stats.insights.revenueToday}` : undefined}
        icon={Wallet}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.revenueMonth")}
        value={
          stats?.insights.revenueThisMonth != null
            ? `€${stats.insights.revenueThisMonth}`
            : undefined
        }
        icon={Wallet}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.totalOrders")}
        value={stats?.totalOrders}
        icon={Receipt}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.completedOrders")}
        value={stats?.completedOrders}
        icon={CheckCircle2}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.cancelledOrders")}
        value={stats?.cancelledOrders}
        icon={Ban}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.customers")}
        value={stats?.customers}
        icon={Users}
        loading={loading}
        hint={t("metrics.hint.profiles")}
      />
      <MetricCard
        label={t("metrics.drivers")}
        value={stats?.drivers.total}
        icon={Truck}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.driversOnline")}
        value={stats?.drivers.online}
        icon={Radio}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.driversDelivering")}
        value={stats?.drivers.delivering}
        icon={Truck}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.driversUsedToday")}
        value={stats?.insights.driversUsedToday}
        icon={Truck}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.peakHour")}
        value={peakHour}
        icon={Radio}
        loading={loading}
        hint={t("metrics.hint.peakHour")}
      />
      <MetricCard
        label={t("metrics.topProduct")}
        value={stats?.insights.mostPopularProduct ?? "—"}
        icon={Package}
        loading={loading}
        hint={t("metrics.hint.topProduct")}
      />
      <MetricCard
        label={t("metrics.menuItems")}
        value={stats?.menuItems}
        icon={Package}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.categories")}
        value={stats?.categories}
        icon={FolderTree}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.platformVersion")}
        value={stats?.system.version}
        icon={LayoutGrid}
        loading={loading}
      />
      <MetricCard
        label={t("metrics.environment")}
        value={stats?.system.environment}
        icon={LayoutGrid}
        loading={loading}
      />
    </div>
  );
}
