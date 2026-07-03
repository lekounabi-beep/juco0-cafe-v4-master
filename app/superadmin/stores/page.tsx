"use client";

import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { StoresTable } from "@/features/superadmin/components/stores/StoresTable";
import { useSuperAdminStats } from "@/features/superadmin/hooks/useSuperAdminStats";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export default function SuperAdminStoresPage() {
  const { stats, loading } = useSuperAdminStats();
  const { t } = useSuperAdminT();

  return (
    <div>
      <SuperAdminPageHeader title={t("nav.stores")} description={t("page.stores.description")} />
      <StoresTable stores={stats?.stores ?? []} loading={loading} />
    </div>
  );
}
