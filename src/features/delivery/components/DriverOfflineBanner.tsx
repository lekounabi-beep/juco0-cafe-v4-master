'use client';

import { useOfflineSync } from '@/features/delivery/hooks/useOfflineSync';
import { WifiOff, RefreshCw } from 'lucide-react';

export function DriverOfflineBanner() {
  const { isOnline, isReconnecting, isSyncing, deliveryPendingCount } = useOfflineSync();

  if (isReconnecting) {
    return (
      <div className="sticky top-0 z-40 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm font-medium text-amber-200">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Επανασύνδεση…</span>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="sticky top-0 z-40 border-b border-red-500/30 bg-red-500/15 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm font-medium text-red-200">
          <WifiOff className="h-4 w-4" />
          <span>Λειτουργία offline — οι ενέργειες αποθηκεύονται τοπικά</span>
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
          <span>Συγχρονισμός εκκρεμών ενεργειών…</span>
          <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-xs">
            {deliveryPendingCount}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
