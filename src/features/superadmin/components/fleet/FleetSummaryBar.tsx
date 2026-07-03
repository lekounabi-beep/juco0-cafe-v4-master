"use client";

import type { SuperAdminFleetSummary } from "@/features/superadmin/types/superadmin-fleet.types";
import { MetricCard } from "@/features/superadmin/components/overview/MetricCard";
import { MapPin, Radio, Truck, UserX } from "lucide-react";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import { localeTimeString } from "@/features/superadmin/i18n/messages";

export function FleetSummaryBar({
  summary,
  loading,
}: {
  summary: SuperAdminFleetSummary;
  loading: boolean;
}) {
  const { t, locale } = useSuperAdminT();
  const lastUpdate = localeTimeString(locale, summary.last_fleet_update);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
      <MetricCard label={t("fleet.total")} value={summary.total} loading={loading} />
      <MetricCard label={t("fleet.online")} value={summary.online} icon={Radio} loading={loading} />
      <MetricCard
        label={t("fleet.delivering")}
        value={summary.delivering}
        icon={Truck}
        loading={loading}
      />
      <MetricCard
        label={t("fleet.offline")}
        value={summary.offline}
        icon={UserX}
        loading={loading}
      />
      <MetricCard
        label={t("fleet.gpsActive")}
        value={summary.gps_active}
        icon={MapPin}
        loading={loading}
      />
      <MetricCard
        label={t("fleet.gpsStaleShort")}
        value={summary.gps_stale}
        icon={MapPin}
        loading={loading}
      />
      <MetricCard
        label={t("fleet.lastUpdate")}
        value={lastUpdate}
        loading={loading}
        hint={t("fleet.summaryHint")}
      />
    </div>
  );
}
