"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { PlatformHealthBanner } from "@/features/superadmin/components/overview/PlatformHealthBanner";
import { OperationalAlertsPanel } from "@/features/superadmin/components/overview/OperationalAlertsPanel";
import { OrderDurationMonitor } from "@/features/superadmin/components/overview/OperationalAlertsPanel";
import {
  OperationsCard,
  OperationsStatRow,
} from "@/features/superadmin/components/overview/OperationsCards";
import { useSuperAdminStats } from "@/features/superadmin/hooks/useSuperAdminStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import { localeDateTimeString } from "@/features/superadmin/i18n/messages";

export default function SuperAdminMonitoringPage() {
  const { stats, loading, refresh } = useSuperAdminStats();
  const { t, locale } = useSuperAdminT();

  const driverAlerts = (stats?.alerts ?? []).filter((a) => a.entityType === "driver");
  const paymentAlerts = (stats?.alerts ?? []).filter((a) => a.entityType === "payment");

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title={t("nav.monitoring")}
        description={t("page.monitoring.description")}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 bg-zinc-900 text-zinc-300"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
        }
      />

      <PlatformHealthBanner
        health={stats?.platformHealth}
        loading={loading}
        lastUpdated={stats?.fetchedAt}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <OperationalAlertsPanel alerts={stats?.alerts ?? []} loading={loading} />
        <OrderDurationMonitor alerts={stats?.durationAlerts ?? []} loading={loading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OperationsCard
          title={t("page.monitoring.gps")}
          href="/superadmin/drivers"
          loading={loading}
        >
          <div className="space-y-2">
            <OperationsStatRow
              label={t("fleet.gpsStale")}
              value={stats?.fleetHealth.gpsStale ?? 0}
              tone="warning"
            />
            <OperationsStatRow
              label={t("fleet.lastGps")}
              value={localeDateTimeString(locale, stats?.fleetHealth.lastGpsReceived)}
            />
            <OperationsStatRow
              label={t("page.monitoring.driverAlerts")}
              value={driverAlerts.length}
            />
          </div>
        </OperationsCard>

        <OperationsCard title={t("nav.payments")} href="/superadmin/payments" loading={loading}>
          <div className="space-y-2">
            <OperationsStatRow
              label={t("page.monitoring.failedPayments")}
              value={stats?.payments.failed ?? 0}
              tone="danger"
            />
            <OperationsStatRow
              label={t("page.monitoring.pendingPayments")}
              value={stats?.payments.pending ?? 0}
              tone="warning"
            />
            <OperationsStatRow
              label={t("page.monitoring.paymentAlerts")}
              value={paymentAlerts.length}
            />
          </div>
        </OperationsCard>

        <OperationsCard title={t("health.check.realtime")} loading={loading}>
          <div className="space-y-2">
            <OperationsStatRow
              label={t("page.monitoring.supabaseConfigured")}
              value={stats?.integrations.supabase ? t("common.yes") : t("common.no")}
            />
            <OperationsStatRow
              label={t("page.monitoring.realtimeStatus")}
              value={stats?.system.realtime ?? "unknown"}
            />
            <p className="text-xs text-zinc-500">{t("page.monitoring.realtimeNote")}</p>
          </div>
        </OperationsCard>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-white">
            {t("page.monitoring.unavailableSources")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-zinc-500 sm:grid-cols-2">
          <p>{t("page.monitoring.unavailable.errors")}</p>
          <p>{t("page.monitoring.unavailable.slow")}</p>
          <p>{t("page.monitoring.unavailable.offline")}</p>
          <p>{t("page.monitoring.unavailable.queue")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
