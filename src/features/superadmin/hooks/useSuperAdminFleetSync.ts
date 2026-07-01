/**
 * SuperAdmin fleet sync — mirrors admin drivers polling (8s).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getSuperAdminFleetList } from "@app/actions/superadmin-fleet";
import type {
  SuperAdminFleetDriver,
  SuperAdminFleetSummary,
} from "@/features/superadmin/types/superadmin-fleet.types";

export const SUPERADMIN_FLEET_POLL_INTERVAL_MS = 8_000;

const EMPTY_SUMMARY: SuperAdminFleetSummary = {
  total: 0,
  online: 0,
  delivering: 0,
  offline: 0,
  inactive: 0,
  gps_active: 0,
  gps_stale: 0,
  no_gps: 0,
  last_fleet_update: null,
};

type UseSuperAdminFleetSyncResult = {
  drivers: SuperAdminFleetDriver[];
  summary: SuperAdminFleetSummary;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useSuperAdminFleetSync(): UseSuperAdminFleetSyncResult {
  const [drivers, setDrivers] = useState<SuperAdminFleetDriver[]>([]);
  const [summary, setSummary] = useState<SuperAdminFleetSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const pollTimerRef = useRef<number | null>(null);
  const loadInFlightRef = useRef(false);

  const loadFleet = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    try {
      const result = await getSuperAdminFleetList();

      if (!result.success) {
        console.error("[SuperAdmin Fleet] Failed to load:", result.error);
        if (!options?.silent) {
          setDrivers([]);
          setSummary(EMPTY_SUMMARY);
        }
        return;
      }

      setDrivers(result.drivers);
      setSummary(result.summary);
    } catch (error) {
      console.error("[SuperAdmin Fleet] Failed to load:", error);
      if (!options?.silent) {
        setDrivers([]);
        setSummary(EMPTY_SUMMARY);
      }
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFleet();

    pollTimerRef.current = window.setInterval(() => {
      void loadFleet({ silent: true });
    }, SUPERADMIN_FLEET_POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, [loadFleet]);

  return {
    drivers,
    summary,
    loading,
    refresh: () => loadFleet(),
  };
}
