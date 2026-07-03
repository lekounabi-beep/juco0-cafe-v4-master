"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import type { SuperAdminFleetDriverDetails } from "@/features/superadmin/types/superadmin-fleet.types";
import { DriverStateBadge } from "@/features/admin/components/drivers/DriverStateBadge";
import { isGpsStale } from "@/features/superadmin/utils/operations-derivations";
import { useFleetMapCoordinates } from "@/features/superadmin/hooks/useFleetMapCoordinates";
import { cn } from "@/lib/utils";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

const DriverLiveMap = dynamic(
  () => import("@/features/live-tracking-v2/components/DriverLiveMap").then((m) => m.DriverLiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-zinc-950 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  },
);

export function FleetMapPanel({
  driver,
  loading,
  collapsed,
  onToggleCollapsed,
}: {
  driver: SuperAdminFleetDriverDetails | null;
  loading: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { t } = useSuperAdminT();
  const { driverLocation, destination, hasMapContent, destinationResolving } =
    useFleetMapCoordinates(driver);

  const showTrail =
    driver?.active_delivery?.status === "in_transit" ||
    driver?.active_delivery?.status === "picked_up";

  const [isLgViewport, setIsLgViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLgViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const shouldMountMap = Boolean(driver && hasMapContent && (!collapsed || isLgViewport));

  return (
    <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 sm:min-h-[480px] lg:min-h-[560px]">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {driver?.full_name ?? t("map.selectDriver")}
          </p>
          <p className="text-xs text-zinc-500">{t("map.liveMap")}</p>
        </div>
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline lg:hidden"
          >
            {collapsed ? t("map.show") : t("map.hide")}
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "relative h-[360px] min-h-[360px] w-full sm:h-[420px] sm:min-h-[420px] lg:h-[560px] lg:min-h-[560px]",
          collapsed && "hidden lg:block",
        )}
      >
        {loading && !driver ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : driver && hasMapContent && shouldMountMap ? (
          <>
            <DriverLiveMap
              className="h-full w-full"
              driverLocation={driverLocation}
              destination={destination}
              routePoints={showTrail ? driver?.route_points : undefined}
              showDriverTrail={showTrail}
            />
            {driver ? (
              <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
                <DriverStateBadge state={driver.operational_state} />
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
                    driver.location && !isGpsStale(driver.location.recorded_at)
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300",
                  )}
                >
                  {driver.location
                    ? isGpsStale(driver.location.recorded_at)
                      ? t("fleet.gpsStaleShort")
                      : t("fleet.gpsFresh")
                    : t("fleet.noGps")}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-zinc-500">
            <div className="rounded-full bg-zinc-800 p-4">
              <MapPin className="h-6 w-6 opacity-70" />
            </div>
            <p className="text-sm">
              {driver
                ? driver.operational_state === "offline"
                  ? t("map.offlineNoGps")
                  : destinationResolving
                    ? t("map.liveMap")
                    : t("map.noGps")
                : t("map.selectPrompt")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
