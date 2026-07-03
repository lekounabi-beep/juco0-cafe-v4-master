"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

export default function ServiceWorkerRegistration() {
  usePwaInstall();
  usePWAUpdate();
  return null;
}
