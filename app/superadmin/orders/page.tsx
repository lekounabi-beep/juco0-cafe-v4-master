"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { MetricCard } from "@/features/superadmin/components/overview/MetricCard";
import {
  OperationsCard,
  OperationsStatRow,
} from "@/features/superadmin/components/overview/OperationsCards";
import { OrderDurationMonitor } from "@/features/superadmin/components/overview/OperationalAlertsPanel";
import { useSuperAdminOrdersLiveSync } from "@/features/superadmin/hooks/useSuperAdminOrdersLiveSync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import {
  getMessage,
  localeDateTimeString,
  type SuperAdminMessageKey,
} from "@/features/superadmin/i18n/messages";
import type { SuperAdminOperationalAlert } from "@/features/superadmin/types/superadmin-stats.types";

function alertTitle(locale: "en" | "el", alert: SuperAdminOperationalAlert): string {
  return getMessage(locale, alert.titleKey as SuperAdminMessageKey, alert.messageValues);
}

export default function SuperAdminOrdersPage() {
  const { stats, loading, refresh } = useSuperAdminOrdersLiveSync();
  const { t, locale } = useSuperAdminT();

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title={t("nav.orders")}
        description={t("page.orders.description")}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 bg-zinc-900 text-zinc-300"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("common.refresh")}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label={t("orders.pending")}
          value={stats?.liveOrders.pending}
          loading={loading}
        />
        <MetricCard
          label={t("orders.preparing")}
          value={stats?.liveOrders.preparing}
          loading={loading}
        />
        <MetricCard label={t("orders.ready")} value={stats?.liveOrders.ready} loading={loading} />
        <MetricCard
          label={t("orders.delivering")}
          value={stats?.liveOrders.delivering}
          loading={loading}
        />
        <MetricCard
          label={t("orders.completedToday")}
          value={stats?.liveOrders.completedToday}
          loading={loading}
        />
        <MetricCard
          label={t("orders.cancelledToday")}
          value={stats?.liveOrders.cancelledToday}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OrderDurationMonitor alerts={stats?.durationAlerts ?? []} loading={loading} />
        <OperationsCard title={t("page.orders.alerts")} loading={loading}>
          <div className="space-y-2">
            {(stats?.alerts ?? [])
              .filter((a) => a.entityType === "order")
              .slice(0, 8)
              .map((alert) => (
                <OperationsStatRow
                  key={alert.id}
                  label={alertTitle(locale, alert)}
                  value={t(`severity.${alert.severity}` as SuperAdminMessageKey)}
                />
              ))}
            {(stats?.alerts ?? []).filter((a) => a.entityType === "order").length === 0 ? (
              <p className="text-sm text-zinc-500">{t("page.orders.noOrderAlerts")}</p>
            ) : null}
          </div>
        </OperationsCard>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("page.orders.recentSample")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-zinc-500">
            {t("page.orders.sampleNote", { count: stats ? 150 : "—" })}
          </p>
          <div className="flex flex-wrap gap-2">
            {(["incoming", "preparing", "ready", "on_delivery", "completed"] as const).map(
              (column) => (
                <Badge key={column} variant="outline" className="border-zinc-700 text-zinc-300">
                  {t(`orderColumn.${column}` as SuperAdminMessageKey)}:{" "}
                  {column === "incoming"
                    ? stats?.liveOrders.pending
                    : column === "preparing"
                      ? stats?.liveOrders.preparing
                      : column === "ready"
                        ? stats?.liveOrders.ready
                        : column === "on_delivery"
                          ? stats?.liveOrders.delivering
                          : stats?.completedOrders}
                </Badge>
              ),
            )}
          </div>
          {stats?.fetchedAt ? (
            <p className="mt-4 text-xs text-zinc-600">
              {t("shell.lastUpdated")}: {localeDateTimeString(locale, stats.fetchedAt)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
