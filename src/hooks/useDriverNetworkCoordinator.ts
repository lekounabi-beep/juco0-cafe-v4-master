"use client";

import { useEffect, useMemo } from "react";
import {
  disableDriverNetworkCoordinator,
  enableDriverNetworkCoordinator,
  startDriverNetworkMonitoring,
} from "@/lib/network/driver-network";
import { useDriverNetworkState } from "@/hooks/useDriverNetwork";

/**
 * Activates the driver network coordinator — call once from useDriverPage.
 */
export function useDriverNetworkCoordinator() {
  const {
    phase,
    isVisible,
    isOnline,
    isReconnecting,
    isPollingAllowed,
    isRefreshAllowed,
    shouldSkipRealtime,
  } = useDriverNetworkState();

  useEffect(() => {
    enableDriverNetworkCoordinator();
    startDriverNetworkMonitoring();

    return () => {
      disableDriverNetworkCoordinator();
    };
  }, []);

  return useMemo(
    () => ({
      phase,
      isVisible,
      isOnline,
      isReconnecting,
      isPollingAllowed,
      isRefreshAllowed,
      shouldSkipRealtime,
    }),
    [
      phase,
      isVisible,
      isOnline,
      isReconnecting,
      isPollingAllowed,
      isRefreshAllowed,
      shouldSkipRealtime,
    ],
  );
}
