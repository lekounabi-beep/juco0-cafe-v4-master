'use client';

import { useEffect } from 'react';

/** Registers install-only SW (required for Chrome install prompt). No caching. */
export function usePwaInstall() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => undefined);
  }, []);
}
