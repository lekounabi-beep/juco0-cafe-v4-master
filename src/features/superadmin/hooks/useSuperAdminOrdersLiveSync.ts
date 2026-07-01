"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSuperAdminPlatformStats } from "@app/actions/superadmin-stats";
import type { SuperAdminPlatformStats } from "@/features/superadmin/types/superadmin-stats.types";
import { superAdminOrdersSliceFingerprint } from "@/features/superadmin/utils/stats-fingerprint";

export const SUPERADMIN_ORDERS_POLL_INTERVAL_MS = 6_000;

type UseSuperAdminOrdersLiveSyncResult = {
  stats: SuperAdminPlatformStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Orders-page live sync — polls platform stats but only commits React state when
 * order pipeline data changes (avoids flicker / unnecessary re-renders).
 */
export function useSuperAdminOrdersLiveSync(): UseSuperAdminOrdersLiveSyncResult {
  const [stats, setStats] = useState<SuperAdminPlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const loadInFlightRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const lastFingerprintRef = useRef<string | null>(null);

  const loadStats = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    try {
      const result = await getSuperAdminPlatformStats();

      if (result.success) {
        const fingerprint = superAdminOrdersSliceFingerprint(result.stats);
        const isFirstLoad = !hasLoadedOnceRef.current;

        if (isFirstLoad || lastFingerprintRef.current !== fingerprint) {
          lastFingerprintRef.current = fingerprint;
          setStats(result.stats);
        }

        setError(null);
      } else {
        setError(result.error);
        if (!options?.silent && !hasLoadedOnceRef.current) {
          setStats(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      loadInFlightRef.current = false;
      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadStats();

    pollTimerRef.current = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadStats({ silent: true });
    }, SUPERADMIN_ORDERS_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadStats({ silent: true });
      }
    };

    const onOnline = () => {
      void loadStats({ silent: true });
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [loadStats]);

  return { stats, loading, error, refresh };
}
