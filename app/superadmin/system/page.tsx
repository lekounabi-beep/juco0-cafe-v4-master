"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { SystemHealthGrid } from "@/features/superadmin/components/overview/SystemHealthGrid";
import { PlatformHealthBanner } from "@/features/superadmin/components/overview/PlatformHealthBanner";
import { FeatureFlagsPanel } from "@/features/superadmin/components/flags/FeatureFlagsPanel";
import { useSuperAdminStats } from "@/features/superadmin/hooks/useSuperAdminStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsStatRow } from "@/features/superadmin/components/overview/OperationsCards";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export default function SuperAdminSystemPage() {
  const { stats, loading, refresh } = useSuperAdminStats();
  const { t } = useSuperAdminT();

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title={t("nav.system")}
        description={t("page.system.description")}
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

      <SystemHealthGrid stats={stats} loading={loading} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("page.system.runtime")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("page.system.integrations")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {stats
              ? Object.entries(stats.integrations).map(([key, ok]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                  >
                    <span className="capitalize text-zinc-300">{key}</span>
                    <span className={ok ? "text-emerald-400" : "text-amber-400"}>
                      {ok ? t("integration.configured") : t("integration.missing")}
                    </span>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </div>

      <FeatureFlagsPanel flags={stats?.featureFlags ?? []} />
    </div>
  );
}
