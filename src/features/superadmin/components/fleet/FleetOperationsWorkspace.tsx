"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperAdminPageHeader } from "@/features/superadmin/components/SuperAdminPageHeader";
import { FleetSummaryBar } from "@/features/superadmin/components/fleet/FleetSummaryBar";
import { FleetDriverList } from "@/features/superadmin/components/fleet/FleetDriverList";
import { FleetMapPanel } from "@/features/superadmin/components/fleet/FleetMapPanel";
import { FleetDriverDetailsPanel } from "@/features/superadmin/components/fleet/FleetDriverDetailsPanel";
import { FleetQuickActions } from "@/features/superadmin/components/fleet/FleetQuickActions";
import { useSuperAdminFleetSync } from "@/features/superadmin/hooks/useSuperAdminFleetSync";
import { useSuperAdminFleetDriverDetails } from "@/features/superadmin/hooks/useSuperAdminFleetDriverDetails";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export function FleetOperationsWorkspace() {
  const { drivers, summary, loading, refresh } = useSuperAdminFleetSync();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const { t } = useSuperAdminT();

  const selectedFromList = useMemo(
    () => drivers.find((d) => d.id === selectedId) ?? null,
    [drivers, selectedId],
  );

  useEffect(() => {
    if (!selectedId && drivers.length > 0) {
      const preferred =
        drivers.find((d) => d.operational_state === "delivering") ??
        drivers.find((d) => d.operational_state === "online") ??
        drivers[0];
      setSelectedId(preferred.id);
    }
  }, [drivers, selectedId]);

  const {
    driver: selectedDetails,
    loading: detailsLoading,
    error: detailsError,
    refresh: refreshDetails,
  } = useSuperAdminFleetDriverDetails(selectedId);

  const handleRefresh = () => {
    void refresh();
    void refreshDetails();
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title={t("fleetOps.title")}
        description={t("fleetOps.description")}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 bg-zinc-900 text-zinc-300"
            onClick={handleRefresh}
            disabled={loading || detailsLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading || detailsLoading ? "animate-spin" : ""}`}
            />
            {t("fleetOps.refreshFleet")}
          </Button>
        }
      />

      <FleetSummaryBar summary={summary} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,35%)_minmax(0,65%)] lg:items-start">
        <section className="min-h-[420px] rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:p-4">
          <FleetDriverList
            drivers={drivers}
            loading={loading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>

        <section className="min-h-0 space-y-4">
          <FleetMapPanel
            driver={selectedDetails}
            loading={detailsLoading}
            collapsed={mapCollapsed}
            onToggleCollapsed={() => setMapCollapsed((v) => !v)}
          />

          {detailsError ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {detailsError}
            </p>
          ) : null}

          <FleetQuickActions
            driver={selectedDetails}
            onRefresh={handleRefresh}
            refreshing={loading || detailsLoading}
          />

          <FleetDriverDetailsPanel driver={selectedDetails} loading={detailsLoading} />

          {selectedFromList && !selectedDetails?.active_delivery ? (
            <p className="text-xs text-zinc-600">
              {selectedFromList.operational_state === "offline"
                ? t("fleet.driverOffline")
                : t("fleet.driverOnlineNoDelivery")}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
