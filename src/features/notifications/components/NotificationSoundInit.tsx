"use client";

import { useEffect } from "react";
import { notificationSoundService } from "@/features/notifications/services/notification-sound.service";

const DEV = process.env.NODE_ENV === "development";

/** Preload notification audio (when enabled) and unlock on first user gesture. */
export function NotificationSoundInit() {
  useEffect(() => {
    notificationSoundService.preload();

    if (DEV) {
      void notificationSoundService.validateAsset().then((valid) => {
        if (valid && notificationSoundService.getSettings().notificationSoundEnabled) {
          console.debug("[NotificationSound] Preloaded /notification.mp3");
        }
      });
    }
  }, []);

  return null;
}
