'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { devLog } from '@/shared/utils/dev-log';

type SafeRouterAction = 'push' | 'replace';

function logRouterAction(action: SafeRouterAction, route: string, mounted: boolean, ready: boolean) {
  devLog.log('[ROUTER SAFE]', {
    action,
    route,
    mounted,
    ready,
  });
}

function fallbackNavigate(route: string) {
  if (typeof window === 'undefined') return;
  window.location.assign(route);
}

/**
 * Guards Next.js App Router navigation until the client is mounted and ready.
 * Prevents "router action dispatched before initialization" during PWA reload / fast redirects.
 */
export function useSafeRouter() {
  const router = useRouter();
  const isMountedRef = useRef(false);
  const isReadyRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    const readyFrame = requestAnimationFrame(() => {
      isReadyRef.current = true;
    });

    return () => {
      isMountedRef.current = false;
      isReadyRef.current = false;
      cancelAnimationFrame(readyFrame);
    };
  }, []);

  const run = useCallback(
    (action: SafeRouterAction, url: string) => {
      const mounted = isMountedRef.current;
      const ready = isReadyRef.current;
      logRouterAction(action, url, mounted, ready);

      if (!mounted || !ready) {
        devLog.warn('[ROUTER SAFE] blocked — router not ready', { action, url, mounted, ready });
        return false;
      }

      try {
        if (action === 'push') {
          router.push(url);
        } else {
          router.replace(url);
        }
        return true;
      } catch (error) {
        console.error('[ROUTER SAFE] navigation failed, using location.assign', error);
        fallbackNavigate(url);
        return true;
      }
    },
    [router]
  );

  const push = useCallback((url: string) => run('push', url), [run]);
  const replace = useCallback((url: string) => run('replace', url), [run]);

  const pushWhenReady = useCallback(
    (url: string) => {
      if (isMountedRef.current && isReadyRef.current) {
        return push(url);
      }

      requestAnimationFrame(() => {
        if (!isMountedRef.current) return;
        push(url);
      });
    },
    [push]
  );

  const replaceWhenReady = useCallback(
    (url: string) => {
      if (isMountedRef.current && isReadyRef.current) {
        return replace(url);
      }

      requestAnimationFrame(() => {
        if (!isMountedRef.current) return;
        replace(url);
      });
    },
    [replace]
  );

  return {
    push,
    replace,
    pushWhenReady,
    replaceWhenReady,
    isMounted: () => isMountedRef.current,
    isReady: () => isReadyRef.current,
  };
}
