'use client';

import { useOfflineSync } from '@/features/delivery/hooks/useOfflineSync';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function DriverOfflineBanner() {
  const { isOnline, isSyncing, deliveryPendingCount, pendingCount } = useOfflineSync();

  if (!isOnline) {
    return (
      <div className="sticky top-0 z-40 border-b border-red-500/30 bg-red-500/15 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm font-medium text-red-200">
          <WifiOff className="h-4 w-4" />
          <span>Offline mode — syncing later</span>
          {deliveryPendingCount > 0 && (
            <span className="rounded-full bg-red-500/30 px-2 py-0.5 text-xs">
              {deliveryPendingCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isSyncing && deliveryPendingCount > 0) {
    return (
      <div className="sticky top-0 z-40 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm font-medium text-amber-200">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing pending actions...</span>
          <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-xs">
            {deliveryPendingCount}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 border-b border-emerald-500/30 bg-emerald-500/15 px-4 py-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm font-medium text-emerald-300">
        <Wifi className="h-4 w-4" />
        <span>Connected</span>
        {pendingCount > 0 && deliveryPendingCount === 0 && (
          <span className="sr-only">Background GPS sync pending</span>
        )}
      </div>
    </div>
  );
}
