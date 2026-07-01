"use client";

import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { MetricCard } from "@/features/superadmin/components/overview/MetricCard";
import { useSuperAdminStats } from "@/features/superadmin/hooks/useSuperAdminStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export default function SuperAdminCustomersPage() {
  const { stats, loading } = useSuperAdminStats();
  const { t } = useSuperAdminT();

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title={t("nav.customers")}
        description={t("page.customers.description")}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={t("page.customers.total")}
          value={stats?.customers}
          loading={loading}
          hint={t("page.customers.hintProfiles")}
        />
        <MetricCard label={t("page.customers.newWeek")} comingSoon />
        <MetricCard label={t("page.customers.activeMonth")} comingSoon />
      </div>
      <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("page.customers.list")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">{t("page.customers.listSoon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
