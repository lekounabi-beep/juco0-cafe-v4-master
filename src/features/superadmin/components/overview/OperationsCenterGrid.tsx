"use client";

import { Activity, CreditCard, Monitor, Receipt, ScrollText, Store, Truck } from "lucide-react";
import type { SuperAdminPlatformStats } from "@/features/superadmin/types/superadmin-stats.types";
import {
  OperationsCard,
  OperationsStatRow,
  QuickNavGrid,
} from "@/features/superadmin/components/overview/OperationsCards";
import { OperationalAlertsPanel } from "@/features/superadmin/components/overview/OperationalAlertsPanel";
import { OrderDurationMonitor } from "@/features/superadmin/components/overview/OperationalAlertsPanel";
import { PlatformHealthBanner } from "@/features/superadmin/components/overview/PlatformHealthBanner";
import { OverviewMetricsGrid } from "@/features/superadmin/components/overview/OverviewMetricsGrid";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import { localeTimeString } from "@/features/superadmin/i18n/messages";

export function OperationsCenterGrid({
  stats,
  loading,
}: {
  stats: SuperAdminPlatformStats | null;
  loading: boolean;
}) {
  const { t, locale } = useSuperAdminT();

  return (
    <div className="space-y-6">
      <PlatformHealthBanner
        health={stats?.platformHealth}
        loading={loading}
        lastUpdated={stats?.fetchedAt}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("overview.quickNav")}
        </h2>
        <QuickNavGrid
          items={[
            {
              label: t("quickNav.orders"),
              href: "/superadmin/orders",
              icon: Receipt,
              description: t("quickNav.ordersDesc"),
            },
            {
              label: t("quickNav.fleet"),
              href: "/superadmin/drivers",
              icon: Truck,
              description: t("quickNav.fleetDesc"),
            },
            {
              label: t("quickNav.monitoring"),
              href: "/superadmin/monitoring",
              icon: Monitor,
              description: t("quickNav.monitoringDesc"),
            },
            {
              label: t("quickNav.payments"),
              href: "/superadmin/payments",
              icon: CreditCard,
              description: t("quickNav.paymentsDesc"),
            },
            {
              label: t("quickNav.stores"),
              href: "/superadmin/stores",
              icon: Store,
              description: t("quickNav.storesDesc"),
            },
            {
              label: t("quickNav.system"),
              href: "/superadmin/system",
              icon: Activity,
              description: t("quickNav.systemDesc"),
            },
            {
              label: t("quickNav.logs"),
              href: "/superadmin/logs",
              icon: ScrollText,
              description: t("quickNav.logsDesc"),
            },
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <OperationsCard
          title={t("overview.liveOrders")}
          href="/superadmin/orders"
          loading={loading}
        >
          <div className="space-y-2">
            <OperationsStatRow label={t("orders.pending")} value={stats?.liveOrders.pending ?? 0} />
            <OperationsStatRow
              label={t("orders.preparing")}
              value={stats?.liveOrders.preparing ?? 0}
              tone="warning"
            />
            <OperationsStatRow label={t("orders.ready")} value={stats?.liveOrders.ready ?? 0} />
            <OperationsStatRow
              label={t("orders.delivering")}
              value={stats?.liveOrders.delivering ?? 0}
              tone="success"
            />
            <OperationsStatRow
              label={t("orders.completedToday")}
              value={stats?.liveOrders.completedToday ?? 0}
            />
            <OperationsStatRow
              label={t("orders.cancelledToday")}
              value={stats?.liveOrders.cancelledToday ?? 0}
              tone="danger"
            />
          </div>
        </OperationsCard>

        <OperationsCard
          title={t("overview.fleetHealth")}
          href="/superadmin/drivers"
          loading={loading}
        >
          <div className="space-y-2">
            <OperationsStatRow
              label={t("fleet.online")}
              value={stats?.fleetHealth.online ?? 0}
              tone="success"
            />
            <OperationsStatRow
              label={t("fleet.offline")}
              value={stats?.fleetHealth.offline ?? 0}
              tone="muted"
            />
            <OperationsStatRow
              label={t("fleet.delivering")}
              value={stats?.fleetHealth.delivering ?? 0}
            />
            <OperationsStatRow
              label={t("fleet.gpsStale")}
              value={stats?.fleetHealth.gpsStale ?? 0}
              tone="warning"
            />
            <OperationsStatRow
              label={t("fleet.lastGps")}
              value={localeTimeString(locale, stats?.fleetHealth.lastGpsReceived)}
            />
          </div>
        </OperationsCard>

        <OperationsCard
          title={t("overview.payments")}
          href="/superadmin/payments"
          loading={loading}
        >
          <div className="space-y-2">
            <OperationsStatRow label={t("payments.cash")} value={stats?.payments.cash ?? 0} />
            <OperationsStatRow label={t("payments.card")} value={stats?.payments.card ?? 0} />
            <OperationsStatRow label={t("payments.viva")} value={stats?.payments.viva ?? 0} />
            <OperationsStatRow
              label={t("payments.failed")}
              value={stats?.payments.failed ?? 0}
              tone="danger"
            />
            <OperationsStatRow
              label={t("payments.pending")}
              value={stats?.payments.pending ?? 0}
              tone="warning"
            />
          </div>
        </OperationsCard>

        <OperationsCard
          title={t("overview.systemInfo")}
          href="/superadmin/system"
          loading={loading}
        >
          <div className="space-y-2 text-sm">
            <OperationsStatRow label={t("system.version")} value={stats?.system.version ?? "—"} />
            <OperationsStatRow
              label={t("system.environment")}
              value={stats?.system.environment ?? "—"}
            />
            <OperationsStatRow
              label={t("system.buildMode")}
              value={stats?.system.environment ?? "—"}
            />
            <OperationsStatRow label={t("system.node")} value={stats?.system.nodeVersion ?? "—"} />
            <OperationsStatRow label={t("system.next")} value={stats?.system.nextVersion ?? "—"} />
            <OperationsStatRow
              label={t("system.supabaseProject")}
              value={stats?.system.supabaseProject ?? "—"}
            />
            <OperationsStatRow
              label={t("system.trackingEnabled")}
              value={stats?.system.trackingEnabled ? t("common.yes") : t("common.no")}
            />
            <OperationsStatRow
              label={t("system.mapboxEnabled")}
              value={stats?.system.mapboxEnabled ? t("common.yes") : t("common.no")}
            />
          </div>
        </OperationsCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <OperationalAlertsPanel alerts={stats?.alerts ?? []} loading={loading} />
        <OrderDurationMonitor alerts={stats?.durationAlerts ?? []} loading={loading} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("overview.platformInsights")}
        </h2>
        <OverviewMetricsGrid stats={stats} loading={loading} />
      </section>
    </div>
  );
}
