'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  getDriverNetworkState,
  isDriverPollingAllowed,
  isDriverRefreshAllowed,
  shouldSkipDriverRealtimeCallback,
  subscribeDriverNetwork,
  type DriverNetworkState,
} from '@/lib/network/driver-network';

const SERVER_SNAPSHOT: DriverNetworkState = { phase: 'online', isVisible: true };

function subscribe(callback: () => void): () => void {
  return subscribeDriverNetwork(() => callback());
}

function getSnapshot(): DriverNetworkState {
  return getDriverNetworkState();
}

function getServerSnapshot(): DriverNetworkState {
  return SERVER_SNAPSHOT;
}

/** Read-only driver network state (safe for multiple subscribers). */
export function useDriverNetworkState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(
    () => ({
      phase: state.phase,
      isVisible: state.isVisible,
      isOnline: state.phase === 'online',
      isReconnecting: state.phase === 'reconnecting',
      isPollingAllowed: isDriverPollingAllowed(),
      isRefreshAllowed: isDriverRefreshAllowed(),
      shouldSkipRealtime: shouldSkipDriverRealtimeCallback(),
    }),
    [state],
  );
}
