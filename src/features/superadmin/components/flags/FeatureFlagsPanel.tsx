"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { SuperAdminFeatureFlag } from "@/features/superadmin/types/superadmin-stats.types";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export function FeatureFlagsPanel({ flags }: { flags: SuperAdminFeatureFlag[] }) {
  const { t } = useSuperAdminT();

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">{t("flags.readOnlyNote")}</p>
      <div className="grid gap-3">
        {flags.map((flag) => (
          <Card key={flag.key} className="border-zinc-800 bg-zinc-900/50 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-base text-white">{flag.label}</CardTitle>
                  <CardDescription className="mt-1 text-zinc-500">
                    {flag.description}
                  </CardDescription>
                  <p className="mt-2 font-mono text-xs text-zinc-600">{flag.key}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                    {flag.source}
                  </Badge>
                  <Switch checked={flag.enabled} disabled aria-label={`${flag.label} flag`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-zinc-500">
                {t("flags.status")}:{" "}
                <span className={flag.enabled ? "text-emerald-400" : "text-zinc-400"}>
                  {flag.enabled ? t("flags.enabled") : t("flags.disabled")}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
