"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { useSuperAdminStats } from "@/features/superadmin/hooks/useSuperAdminStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  OperationsCard,
  OperationsStatRow,
} from "@/features/superadmin/components/overview/OperationsCards";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export default function SuperAdminPaymentsPage() {
  const { stats, loading, refresh } = useSuperAdminStats();
  const { t } = useSuperAdminT();
  const vivaConfigured = stats?.integrations.viva;

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title={t("nav.payments")}
        description={t("page.payments.description")}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">
              {t("page.payments.vivaIntegration")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant="outline"
              className={
                vivaConfigured
                  ? "border-emerald-500/30 text-emerald-400"
                  : "border-amber-500/30 text-amber-400"
              }
            >
              {loading
                ? t("common.loading")
                : vivaConfigured
                  ? t("page.payments.configured")
                  : t("page.payments.notConfigured")}
            </Badge>
          </CardContent>
        </Card>

        <OperationsCard title={t("page.payments.methods")} loading={loading}>
          <div className="space-y-2">
            <OperationsStatRow label={t("payments.cash")} value={stats?.payments.cash ?? 0} />
            <OperationsStatRow label={t("payments.card")} value={stats?.payments.card ?? 0} />
            <OperationsStatRow label={t("payments.viva")} value={stats?.payments.viva ?? 0} />
          </div>
        </OperationsCard>

        <OperationsCard title={t("page.payments.status")} loading={loading}>
          <div className="space-y-2">
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
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("page.payments.webhookHealth")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">{t("page.payments.webhookNote")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
