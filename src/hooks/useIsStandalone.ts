'use client';

import { useSyncExternalStore } from 'react';

function getStandaloneSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function subscribeStandalone(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const media = window.matchMedia('(display-mode: standalone)');
  const onChange = () => onStoreChange();

  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** True when the app is running as an installed PWA (Android or iOS). */
export function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, () => false);
}
