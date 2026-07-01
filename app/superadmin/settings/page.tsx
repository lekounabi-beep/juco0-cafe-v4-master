"use client";

import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export default function SuperAdminSettingsPage() {
  const { t } = useSuperAdminT();

  return (
    <div>
      <SuperAdminPageHeader
        title={t("nav.settings")}
        description={t("page.settings.description")}
      />
      <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-white">{t("page.settings.consoleAccess")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-500">
          <p>
            {t("page.settings.currentGate")}{" "}
            <code className="text-zinc-300">NEXT_PUBLIC_SUPERADMIN_ENABLED=true</code>
          </p>
          <p>{t("page.settings.authSoon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
