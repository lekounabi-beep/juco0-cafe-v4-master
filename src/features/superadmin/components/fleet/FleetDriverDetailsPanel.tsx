"use client";

import type { SuperAdminFleetDriverDetails } from "@/features/superadmin/types/superadmin-fleet.types";
import { DriverStateBadge } from "@/features/admin/components/drivers/DriverStateBadge";
import { adminDriverStateLabel } from "@/features/admin/utils/admin-driver-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isGpsStale } from "@/features/superadmin/utils/operations-derivations";
import { cn } from "@/lib/utils";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import { localeDateTimeString } from "@/features/superadmin/i18n/messages";

function formatSpeed(speed: number | null): string {
  if (speed == null || speed <= 0) return "—";
  return `${(speed * 3.6).toFixed(1)} km/h`;
}

function formatHeading(heading: number | null): string {
  if (heading == null) return "—";
  return `${Math.round(heading)}°`;
}

export function FleetDriverDetailsPanel({
  driver,
  loading,
}: {
  driver: SuperAdminFleetDriverDetails | null;
  loading: boolean;
}) {
  const { t, locale } = useSuperAdminT();

  const formatPayment = (method: string | null): string => {
    if (!method) return "—";
    if (method === "card") return t("fleet.paymentCard");
    if (method === "cod") return t("fleet.paymentCod");
    return method;
  };

  if (loading && !driver) {
    return <p className="text-sm text-zinc-500">{t("fleet.loadingDetails")}</p>;
  }

  if (!driver) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
        <CardContent className="py-8 text-center text-sm text-zinc-500">
          {t("fleet.selectDriverPrompt")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base text-white">{driver.full_name}</CardTitle>
              <p className="mt-1 text-xs text-zinc-500">@{driver.username}</p>
            </div>
            <DriverStateBadge state={driver.operational_state} />
            {driver.gps_stale ? (
              <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                {t("fleet.gpsStaleShort")}
              </Badge>
            ) : driver.gps_active ? (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                {t("fleet.gpsFresh")}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Detail label={t("fleet.vehicle")} value={driver.vehicle_type ?? "—"} />
          <Detail label={t("fleet.phone")} value={driver.phone ?? "—"} />
          <Detail label={t("fleet.status")} value={adminDriverStateLabel(driver.operational_state)} />
          <Detail label={t("fleet.availability")} value={driver.availability_status} />
          <Detail
            label={t("fleet.lastGps")}
            value={
              driver.location
                ? localeDateTimeString(locale, driver.location.recorded_at)
                : t("fleet.noGps")
            }
          />
          <Detail
            label={t("fleet.coordinates")}
            value={
              driver.location
                ? `${driver.location.lat.toFixed(5)}, ${driver.location.lng.toFixed(5)}`
                : "—"
            }
          />
          <Detail
            label={t("fleet.lastUpdate")}
            value={
              driver.location
                ? localeDateTimeString(locale, driver.location.recorded_at)
                : driver.last_location_update
                  ? localeDateTimeString(locale, driver.last_location_update)
                  : "—"
            }
          />
          <Detail
            label={t("fleet.gpsFreshness")}
            value={
              driver.location
                ? isGpsStale(driver.location.recorded_at)
                  ? t("fleet.gpsStaleLabel")
                  : t("fleet.gpsFreshLabel")
                : t("fleet.noGps")
            }
          />
          <Detail label={t("fleet.speed")} value={formatSpeed(driver.location?.speed ?? null)} />
          <Detail label={t("fleet.heading")} value={formatHeading(driver.location?.heading ?? null)} />
        </CardContent>
      </Card>

      {driver.active_delivery ? (
        <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">{t("fleet.currentDelivery")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label={t("fleet.order")} value={`#${driver.active_delivery.order_number}`} />
            <Detail label={t("fleet.customer")} value={driver.active_delivery.customer_name} />
            <Detail label={t("fleet.address")} value={driver.active_delivery.address} className="sm:col-span-2" />
            <Detail label={t("fleet.deliveryStage")} value={driver.active_delivery.status} />
            <Detail
              label={t("fleet.orderStatus")}
              value={driver.active_delivery.order_delivery_status ?? "—"}
            />
            <Detail label={t("fleet.payment")} value={formatPayment(driver.active_delivery.payment_method)} />
            <Detail
              label={t("fleet.eta")}
              value={
                driver.active_delivery.eta_minutes != null
                  ? `~${driver.active_delivery.eta_minutes} ${t("common.minutes")}`
                  : "—"
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
          <CardContent className="py-6 text-center text-sm text-zinc-500">
            {t("fleet.noActiveDelivery")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-1 text-zinc-200">{value}</p>
    </div>
  );
}
