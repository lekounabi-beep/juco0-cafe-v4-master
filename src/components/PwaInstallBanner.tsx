'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'pwa_install_dismissed';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true);
      return;
    }
    setDismissed(false);

    if (isIos()) {
      setShowIos(true);
    }

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
    dismiss();
  }, [deferred, dismiss]);

  if (isStandalone() || dismissed) return null;
  if (!deferred && !showIos) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-black/90 p-4 shadow-xl backdrop-blur-md">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Εγκατάσταση Juco Driver</p>
          {deferred ? (
            <p className="mt-1 text-xs text-white/60">Πρόσθεσε την εφαρμογή στην αρχική οθόνη.</p>
          ) : (
            <p className="mt-1 text-xs text-white/60">
              Πάτα <Share className="inline h-3 w-3" /> Κοινοποίηση → «Προσθήκη στην Αρχική».
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
              Εγκατάσταση
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Κλείσιμο"
            className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
