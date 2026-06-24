'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the service worker and forces a reload when a new version activates.
 */
export function usePWAUpdate() {
  const pendingReload = useRef(false);
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const onControllerChange = () => {
      if (!pendingReload.current) return;
      pendingReload.current = false;
      // Full page reload only — never use Next.js router after SW controller change.
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const watchInstallingWorker = (registration: ServiceWorkerRegistration) => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener('statechange', () => {
        if (worker.state !== 'installed') return;
        if (!navigator.serviceWorker.controller) return;

        pendingReload.current = true;

        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast.info('New version available, updating...');
        }

        worker.postMessage({ type: 'SKIP_WAITING' });
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          pendingReload.current = true;
          if (!hasShownToast.current) {
            hasShownToast.current = true;
            toast.info('New version available, updating...');
          }
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          watchInstallingWorker(registration);
        });

        await registration.update();
      } catch {
        // SW unavailable (e.g. insecure context) — ignore silently
      }
    };

    void register();

    const checkForUpdate = () => {
      void navigator.serviceWorker.getRegistration().then((registration) => {
        registration?.update();
      });
    };

    const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_MS);
    window.addEventListener('focus', checkForUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.clearInterval(intervalId);
      window.removeEventListener('focus', checkForUpdate);
    };
  }, []);
}
