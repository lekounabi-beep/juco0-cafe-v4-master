"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { OperationsCenterGrid } from "@/features/superadmin/components/overview/OperationsCenterGrid";
import { useSuperAdminStats } from "@/features/superadmin/hooks/useSuperAdminStats";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import { localeDateTimeString } from "@/features/superadmin/i18n/messages";

export function SuperAdminOverviewPage() {
  const { stats, loading, error, refresh } = useSuperAdminStats();
  const { t, locale } = useSuperAdminT();

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title={t("overview.title")}
        description={t("overview.description")}
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

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <OperationsCenterGrid stats={stats} loading={loading} />

      {stats?.fetchedAt ? (
        <p className="text-xs text-zinc-600">
          {t("shell.lastUpdated")}: {localeDateTimeString(locale, stats.fetchedAt)}
        </p>
      ) : null}
    </div>
  );
}
