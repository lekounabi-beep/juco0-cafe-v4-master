"use client";

import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { FeatureFlagsPanel } from "@/features/superadmin/components/flags/FeatureFlagsPanel";
import { useSuperAdminStats } from "@/features/superadmin/hooks/useSuperAdminStats";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export default function SuperAdminFlagsPage() {
  const { stats, loading } = useSuperAdminStats();
  const { t } = useSuperAdminT();

  return (
    <div>
      <SuperAdminPageHeader title={t("nav.flags")} description={t("page.flags.description")} />
      {loading ? (
        <p className="text-sm text-zinc-500">{t("page.flags.loading")}</p>
      ) : (
        <FeatureFlagsPanel flags={stats?.featureFlags ?? []} />
      )}
    </div>
  );
}
