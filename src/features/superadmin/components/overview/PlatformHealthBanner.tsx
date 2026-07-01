"use client";

import { cn } from "@/lib/utils";
import type { SuperAdminPlatformHealth } from "@/features/superadmin/types/superadmin-stats.types";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import type { SuperAdminMessageKey } from "@/features/superadmin/i18n/messages";

const STATUS_STYLES = {
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
} as const;

const CHECK_STYLES = {
  ok: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
  unknown: "text-zinc-500",
} as const;

export function PlatformHealthBanner({
  health,
  loading,
  lastUpdated,
}: {
  health: SuperAdminPlatformHealth | null | undefined;
  loading?: boolean;
  lastUpdated?: string | null;
}) {
  const { t, locale } = useSuperAdminT();

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-xl bg-zinc-800" />;
  }

  if (!health) return null;

  const title =
    health.status === "healthy"
      ? t("health.healthy")
      : health.status === "warning"
        ? t("health.warning")
        : t("health.critical");

  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4",
        STATUS_STYLES[health.status],
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{title}</p>
          {lastUpdated ? (
            <p className="mt-1 text-xs opacity-80">
              {t("health.lastUpdate")}:{" "}
              {new Date(lastUpdated).toLocaleTimeString(locale === "el" ? "el-GR" : "en-GB")}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {health.checks.map((check) => (
            <div key={check.key} className="flex items-center gap-2">
              <span className={CHECK_STYLES[check.status]}>
                {check.status === "ok" ? "✓" : check.status === "error" ? "✕" : "!"}
              </span>
              <span>{t(`health.check.${check.key}` as SuperAdminMessageKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
