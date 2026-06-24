export type NotificationSettings = {
  notificationSoundEnabled: boolean;
  notificationVolume: number;
};

export type PlayNotificationOptions = {
  eventId?: string;
  orderId?: string;
  /** Bypass throttle + dedup (e.g. test button) */
  force?: boolean;
};

export type NotificationSoundStatus = {
  enabled: boolean;
  sessionMuted: boolean;
  volume: number;
  unlocked: boolean;
  ready: boolean;
  preloaded: boolean;
  hidden: boolean;
  lastPlayedAt: number;
  settings: NotificationSettings;
};
