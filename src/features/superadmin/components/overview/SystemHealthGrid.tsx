"use client";

import { Activity, Database, MapPin, Radio, Server, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SuperAdminPlatformStats } from "@/features/superadmin/types/superadmin-stats.types";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import type { SuperAdminMessageKey } from "@/features/superadmin/i18n/messages";

type HealthItem = {
  labelKey: SuperAdminMessageKey;
  status: string;
  tone: "ok" | "warn" | "muted" | "soon";
  icon: typeof Server;
};

function toneClass(tone: HealthItem["tone"]) {
  switch (tone) {
    case "ok":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "warn":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "soon":
      return "text-zinc-500 bg-zinc-800/50 border-zinc-700/50";
    default:
      return "text-zinc-400 bg-zinc-800/30 border-zinc-700/40";
  }
}

function mapStatus(labelKey: SuperAdminMessageKey, value: string, icon: typeof Server): HealthItem {
  const lower = value.toLowerCase();
  let tone: HealthItem["tone"] = "muted";
  if (lower.includes("healthy") || lower.includes("configured") || lower.includes("available")) {
    tone = "ok";
  } else if (lower.includes("not_configured") || lower.includes("unhealthy")) {
    tone = "warn";
  } else if (lower.includes("coming") || lower.includes("client_only") || lower.includes("none")) {
    tone = "soon";
  }
  return { labelKey, status: value.replace(/_/g, " "), tone, icon };
}

export function SystemHealthGrid({
  stats,
  loading,
}: {
  stats: SuperAdminPlatformStats | null;
  loading: boolean;
}) {
  const { t } = useSuperAdminT();

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-zinc-800 bg-zinc-900/50 shadow-none">
            <CardContent className="h-20 animate-pulse p-6" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-zinc-500">{t("healthGrid.unavailable")}</p>;
  }

  const items: HealthItem[] = [
    mapStatus("healthGrid.api", stats.system.api, Server),
    mapStatus("healthGrid.database", stats.system.database, Database),
    mapStatus("healthGrid.realtime", stats.system.realtime, Radio),
    mapStatus("healthGrid.gps", stats.system.gps, MapPin),
    mapStatus("healthGrid.mapbox", stats.system.mapbox, MapPin),
    mapStatus("healthGrid.payments", stats.system.payments, Activity),
    mapStatus("healthGrid.offlineQueue", stats.system.offlineQueue, WifiOff),
    mapStatus("healthGrid.backgroundJobs", stats.system.backgroundJobs, Server),
    mapStatus("healthGrid.notifications", stats.system.notifications, Activity),
    mapStatus("healthGrid.build", stats.system.build, Server),
    mapStatus("healthGrid.version", stats.system.version, Server),
    mapStatus("healthGrid.environment", stats.system.environment, Server),
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.labelKey} className="border-zinc-800 bg-zinc-900/50 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">
                {t(item.labelKey)}
              </CardTitle>
              <Icon className="h-4 w-4 text-zinc-600" />
            </CardHeader>
            <CardContent>
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
                  toneClass(item.tone),
                )}
              >
                {item.status}
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
