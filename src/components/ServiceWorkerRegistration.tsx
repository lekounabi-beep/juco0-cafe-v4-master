'use client';

import { usePwaInstall } from '@/hooks/usePwaInstall';

export default function ServiceWorkerRegistration() {
  usePwaInstall();
  return null;
}
