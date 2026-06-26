'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  applyPwaUpdate,
  isPwaReloadBlocked,
  noteWaitingPwaWorker,
} from '@/lib/pwa-update-guard';

const UPDATE_CHECK_MS = 60 * 60 * 1000;
const UPDATE_TOAST_ID = 'pwa-update-prompt';

/**
 * Registers SW in production. Shows an update prompt — never auto-reloads on focus.
 * Reload only after the user taps "Ενημέρωση" (or after delivery ends if deferred).
 */
export function usePWAUpdate() {
  const pendingReload = useRef(false);
  const promptShown = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Dev / tunnel: SW + stale caches are cleared by PwaDevCleanup before React loads.
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const runReload = () => {
      pendingReload.current = false;
      window.location.reload();
    };

    const onControllerChange = () => {
      if (!pendingReload.current) return;
      if (isPwaReloadBlocked()) return;
      runReload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const onUpdateApplied = () => {
      pendingReload.current = true;
    };
    window.addEventListener('pwa:update-applied', onUpdateApplied);

    const promptForUpdate = (worker: ServiceWorker) => {
      noteWaitingPwaWorker(worker);

      if (isPwaReloadBlocked()) {
        if (promptShown.current) return;
        promptShown.current = true;
        toast.info('Νέα έκδοση — θα εγκατασταθεί μετά την παράδοση', {
          id: UPDATE_TOAST_ID,
          duration: 8000,
        });
        return;
      }

      if (promptShown.current) return;
      promptShown.current = true;

      toast.info('Νέα έκδοση διαθέσιμη', {
        id: UPDATE_TOAST_ID,
        description: 'Πάτα Ενημέρωση για να εγκατασταθεί η νέα έκδοση.',
        duration: Infinity,
        action: {
          label: 'Ενημέρωση',
          onClick: () => {
            pendingReload.current = true;
            const outcome = applyPwaUpdate();
            if (outcome === 'deferred') {
              pendingReload.current = false;
              toast.info('Θα ενημερωθεί μετά την παράδοση');
              return;
            }
            if (outcome === 'none') {
              pendingReload.current = false;
            }
          },
        },
      });
    };

    const watchInstallingWorker = (registration: ServiceWorkerRegistration) => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener('statechange', () => {
        if (worker.state !== 'installed') return;
        if (!navigator.serviceWorker.controller) return;
        promptForUpdate(worker);
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          promptForUpdate(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          watchInstallingWorker(registration);
        });

        await registration.update();
      } catch {
        // SW unavailable — ignore
      }
    };

    void register();

    const intervalId = window.setInterval(() => {
      void navigator.serviceWorker.getRegistration().then((registration) => {
        registration?.update();
      });
    }, UPDATE_CHECK_MS);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('pwa:update-applied', onUpdateApplied);
      window.clearInterval(intervalId);
      toast.dismiss(UPDATE_TOAST_ID);
    };
  }, []);
}
