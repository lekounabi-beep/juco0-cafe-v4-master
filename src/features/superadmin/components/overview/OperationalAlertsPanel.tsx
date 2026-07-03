"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { SuperAdminOperationalAlert } from "@/features/superadmin/types/superadmin-stats.types";
import { OperationsCard } from "@/features/superadmin/components/overview/OperationsCards";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import type { SuperAdminMessageKey } from "@/features/superadmin/i18n/messages";

const SEVERITY_STYLES = {
  info: "border-zinc-600 text-zinc-300",
  warning: "border-amber-500/30 text-amber-400",
  critical: "border-red-500/30 text-red-400",
} as const;

function translateAlert(
  alert: SuperAdminOperationalAlert,
  t: (key: SuperAdminMessageKey, values?: Record<string, string | number>) => string,
) {
  return {
    title: t(alert.titleKey as SuperAdminMessageKey, alert.messageValues),
    message: t(alert.messageKey as SuperAdminMessageKey, alert.messageValues),
  };
}

export function OperationalAlertsPanel({
  alerts,
  loading,
}: {
  alerts: SuperAdminOperationalAlert[];
  loading?: boolean;
}) {
  const { t } = useSuperAdminT();

  return (
    <OperationsCard
      title={t("overview.operationalAlerts")}
      href="/superadmin/monitoring"
      loading={loading}
    >
      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("overview.noAlerts")}</p>
      ) : (
        <ul className="space-y-3">
          {alerts.slice(0, 8).map((alert) => {
            const copy = translateAlert(alert, t);
            return (
              <li key={alert.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {alert.href ? (
                      <Link
                        href={alert.href}
                        className="text-sm font-medium text-white hover:underline"
                      >
                        {copy.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-white">{copy.title}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">{copy.message}</p>
                  </div>
                  <Badge variant="outline" className={SEVERITY_STYLES[alert.severity]}>
                    {t(`severity.${alert.severity}` as SuperAdminMessageKey)}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </OperationsCard>
  );
}

export function OrderDurationMonitor({
  alerts,
  loading,
}: {
  alerts: import("@/features/superadmin/types/superadmin-stats.types").SuperAdminOrderDurationAlert[];
  loading?: boolean;
}) {
  const { t } = useSuperAdminT();

  return (
    <OperationsCard title={t("overview.orderDuration")} href="/superadmin/orders" loading={loading}>
      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("overview.noDurationAlerts")}</p>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 8).map((alert) => (
            <li key={alert.orderId} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-zinc-300">
                #{alert.orderNumber} · {t(`duration.stage.${alert.stage}` as SuperAdminMessageKey)}
              </span>
              <span className="text-amber-400 tabular-nums">
                {alert.durationMinutes} {t("common.minutes")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </OperationsCard>
  );
}
