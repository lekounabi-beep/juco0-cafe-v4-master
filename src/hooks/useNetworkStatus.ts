'use client';

import { useCallback, useEffect, useState } from 'react';

export const NETWORK_ONLINE_EVENT = 'juco:network-online';

type NetworkConnection = {
  effectiveType?: string;
  type?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function readConnectionType(): string | null {
  if (typeof navigator === 'undefined') return null;
  const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
  return connection?.effectiveType ?? connection?.type ?? null;
}

export function useNetworkStatus() {
  // Always start online so SSR and the first client render match (navigator.onLine
  // can be false on mobile during hydration even when the page is reachable).
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    setConnectionType(readConnectionType());
    return online;
  }, []);

  useEffect(() => {
    setIsHydrated(true);
    refresh();

    const handleOnline = () => {
      const hadBeenOffline = wasOffline || !navigator.onLine;
      setIsOnline(true);
      setConnectionType(readConnectionType());
      if (hadBeenOffline) {
        window.dispatchEvent(new CustomEvent(NETWORK_ONLINE_EVENT));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setConnectionType(readConnectionType());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
    connection?.addEventListener?.('change', refresh);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener?.('change', refresh);
    };
  }, [refresh, wasOffline]);

  return { isOnline, wasOffline, connectionType, isHydrated };
}
