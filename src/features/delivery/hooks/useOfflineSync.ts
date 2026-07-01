'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  subscribeSyncState,
  type SyncState,
} from '@/features/delivery/services/offline-queue.service';
import { useDriverNetworkState } from '@/hooks/useDriverNetwork';

const INITIAL_SYNC_STATE: SyncState = {
  isSyncing: false,
  pendingCount: 0,
  deliveryPendingCount: 0,
  failedCount: 0,
};

export function useOfflineSync() {
  const { phase, isOnline, isReconnecting } = useDriverNetworkState();
  const [syncState, setSyncState] = useState<SyncState>(INITIAL_SYNC_STATE);

  useEffect(() => subscribeSyncState(setSyncState), []);

  return useMemo(
    () => ({ ...syncState, isOnline, isReconnecting, phase }),
    [syncState, isOnline, isReconnecting, phase],
  );
}
