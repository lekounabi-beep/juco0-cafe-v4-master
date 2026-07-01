/**
 * Admin drivers workspace sync — server-authoritative polling.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getAdminDriversList } from "@app/actions/admin-drivers";
import type {
  AdminDriverListItem,
  AdminDriverSummary,
} from "@/features/admin/types/admin-driver.types";
const ADMIN_DRIVERS_POLL_INTERVAL_MS = 8_000;

type UseAdminDriversSyncResult = {
  drivers: AdminDriverListItem[];
  summary: AdminDriverSummary;
  loading: boolean;
  refresh: () => Promise<void>;
};

const EMPTY_SUMMARY: AdminDriverSummary = {
  total: 0,
  online: 0,
  delivering: 0,
  offline: 0,
  inactive: 0,
};

export function useAdminDriversSync(): UseAdminDriversSyncResult {
  const [drivers, setDrivers] = useState<AdminDriverListItem[]>([]);
  const [summary, setSummary] = useState<AdminDriverSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const pollTimerRef = useRef<number | null>(null);
  const loadInFlightRef = useRef(false);

  const loadDrivers = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    try {
      const result = await getAdminDriversList();

      if (!result.success) {
        console.error("[Admin] Failed to load drivers:", result.error);
        if (result.error.includes("Unauthorized")) {
          toast.error(result.error);
        }
        if (!options?.silent) {
          setDrivers([]);
          setSummary(EMPTY_SUMMARY);
        }
        return;
      }

      setDrivers(result.drivers);
      setSummary(result.summary);
    } catch (error) {
      console.error("[Admin] Failed to load drivers:", error);
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load drivers");
      }
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrivers();

    pollTimerRef.current = window.setInterval(() => {
      void loadDrivers({ silent: true });
    }, ADMIN_DRIVERS_POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, [loadDrivers]);

  return {
    drivers,
    summary,
    loading,
    refresh: () => loadDrivers(),
  };
}
