'use client';

import { useEffect, useState } from 'react';
import {
  syncOfflineQueue,
  subscribeSyncState,
  type SyncState,
} from '@/features/delivery/services/offline-queue.service';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const INITIAL_SYNC_STATE: SyncState = {
  isSyncing: false,
  pendingCount: 0,
  deliveryPendingCount: 0,
  failedCount: 0,
};

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus();
  const [syncState, setSyncState] = useState<SyncState>(INITIAL_SYNC_STATE);

  useEffect(() => subscribeSyncState(setSyncState), []);

  useEffect(() => {
    if (isOnline) {
      void syncOfflineQueue();
    }
  }, [isOnline]);

  return { ...syncState, isOnline };
}
