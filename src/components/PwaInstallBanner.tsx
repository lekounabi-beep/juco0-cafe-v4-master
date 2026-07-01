'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Share, X } from 'lucide-react';
import { useIsStandalone } from '@/hooks/useIsStandalone';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY_CUSTOMER = 'pwa_install_dismissed_customer';
const DISMISS_KEY_DRIVER = 'pwa_install_dismissed_driver';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isDriverRoute(pathname: string): boolean {
  return pathname === '/driver' || pathname.startsWith('/driver/');
}

function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function dismissKeyForPath(pathname: string): string {
  return isDriverRoute(pathname) ? DISMISS_KEY_DRIVER : DISMISS_KEY_CUSTOMER;
}

export function PwaInstallBanner() {
  const pathname = usePathname();
  const isStandalone = useIsStandalone();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  const isDriver = isDriverRoute(pathname);
  const isAdmin = isAdminRoute(pathname);

  useEffect(() => {
    if (isStandalone || isAdmin) return;

    const dismissKey = dismissKeyForPath(pathname);
    if (sessionStorage.getItem(dismissKey) === '1') {
      setDismissed(true);
      return;
    }
    setDismissed(false);

    setShowIos(isIos());

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      console.log('[PWA] beforeinstallprompt fired', { route: pathname, variant: isDriver ? 'driver' : 'customer' });
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      console.log('[PWA] appinstalled', { route: pathname, variant: isDriver ? 'driver' : 'customer' });
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [isStandalone, isAdmin, pathname, isDriver]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(dismissKeyForPath(pathname), '1');
    setDismissed(true);
  }, [pathname]);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
    dismiss();
  }, [deferred, dismiss]);

  if (isStandalone || dismissed || isAdmin) return null;
  if (!deferred && !showIos) return null;

  const title = isDriver ? 'Install Juco Driver' : 'Install Juco';
  const androidHint = isDriver
    ? 'Add the driver app to your home screen.'
    : 'Add Juco to your home screen for faster ordering.';

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-black/90 p-4 shadow-xl backdrop-blur-md">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          {deferred ? (
            <p className="mt-1 text-xs text-white/60">{androidHint}</p>
          ) : (
            <p className="mt-1 text-xs text-white/60">
              Tap <Share className="inline h-3 w-3" /> Share → &quot;Add to Home Screen&quot;.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {deferred ? (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
