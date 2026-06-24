'use client';

import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export default function ServiceWorkerRegistration() {
  usePWAUpdate();
  return null;
}
