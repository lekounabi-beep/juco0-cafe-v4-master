"use client";

import { useCallback, useEffect, useState } from "react";
import { getSuperAdminFleetDriverDetails } from "@app/actions/superadmin-fleet";
import type { SuperAdminFleetDriverDetails } from "@/features/superadmin/types/superadmin-fleet.types";
import { SUPERADMIN_FLEET_POLL_INTERVAL_MS } from "@/features/superadmin/hooks/useSuperAdminFleetSync";

export function useSuperAdminFleetDriverDetails(driverId: string | null) {
  const [driver, setDriver] = useState<SuperAdminFleetDriverDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(
    async (silent = false) => {
      if (!driverId) return;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await getSuperAdminFleetDriverDetails(driverId);
        if (!result.success) {
          setError(result.error);
          setDriver(null);
          return;
        }
        setDriver(result.driver);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load driver");
        setDriver(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [driverId],
  );

  useEffect(() => {
    if (!driverId) {
      setDriver(null);
      setError(null);
      return;
    }

    void loadDetails();

    const timer = window.setInterval(() => {
      void loadDetails(true);
    }, SUPERADMIN_FLEET_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [driverId, loadDetails]);

  return { driver, loading, error, refresh: () => loadDetails() };
}
