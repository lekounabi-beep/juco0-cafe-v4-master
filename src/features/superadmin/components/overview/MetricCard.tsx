"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  comingSoon,
  loading,
  className,
}: {
  label: string;
  value?: string | number;
  icon?: LucideIcon;
  hint?: string;
  comingSoon?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const { t } = useSuperAdminT();

  return (
    <Card className={cn("border-zinc-800 bg-zinc-900/50 shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-zinc-600" /> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20 bg-zinc-800" />
        ) : comingSoon ? (
          <p className="text-sm font-medium text-zinc-500">{t("common.comingSoon")}</p>
        ) : (
          <p className="text-2xl font-semibold tabular-nums text-white">{value ?? "—"}</p>
        )}
        {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
