'use client';

import { usePathname } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function isCustomerRoute(pathname: string): boolean {
  return !pathname.startsWith('/driver') && !pathname.startsWith('/admin');
}

export function CustomerOfflineIndicator() {
  const pathname = usePathname();
  const { isOnline, isHydrated } = useNetworkStatus();

  // Defer connectivity UI until after hydration — avoids SSR/client DOM mismatch.
  if (!isHydrated || !isCustomerRoute(pathname) || isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-sm font-medium text-amber-100">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>No internet connection — some features may be unavailable</span>
      </div>
    </div>
  );
}
