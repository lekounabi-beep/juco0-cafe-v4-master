/**
 * Singleton notification audio — one global Audio instance, PWA-safe.
 *
 * TODO: Place a real notification sound at public/notification.mp3 if the
 * auto-generated placeholder is replaced. Spec: 0.2–0.6s soft ding, <50KB.
 */

import type {
  NotificationSettings,
  NotificationSoundStatus,
  PlayNotificationOptions,
} from "../types/notification-settings";
import type { NotificationSoundType } from "../types/notification-sound";

export type { NotificationSoundType } from "../types/notification-sound";
export type { NotificationSettings, PlayNotificationOptions, NotificationSoundStatus };

const SOUND_URL = "/notification.mp3";
const STORAGE_KEY = "juco-notification-settings";
const MIN_ASSET_BYTES = 100;
const THROTTLE_MS = 800;
const DEDUP_TTL_MS = 5000;
const SYSTEM_NOTIFICATION_GRACE_MS = 4000;

const DEV = process.env.NODE_ENV === "development";

const DEFAULT_SETTINGS: NotificationSettings = {
  notificationSoundEnabled: true,
  notificationVolume: 0.7,
};

const DEV_WARN_EMPTY =
  "[NotificationSound] public/notification.mp3 is missing or empty. " +
  "Add a short soft ding (0.2–0.6s, <50KB) to /public/notification.mp3.";

type DedupEntry = { key: string; timestamp: number };

function isBenignPlayError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return err.name === "NotAllowedError" || err.name === "AbortError" || err.name === "NetworkError";
}

function readSettings(): NotificationSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      notificationSoundEnabled:
        parsed.notificationSoundEnabled ?? DEFAULT_SETTINGS.notificationSoundEnabled,
      notificationVolume: clampVolume(
        parsed.notificationVolume ?? DEFAULT_SETTINGS.notificationVolume,
      ),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.notificationVolume;
  return Math.max(0, Math.min(1, value));
}

class NotificationSoundService {
  private static instance: NotificationSoundService | null = null;

  private audio: HTMLAudioElement | null = null;
  private settings: NotificationSettings = { ...DEFAULT_SETTINGS };
  private sessionMuted = false;
  private isUnlocked = false;
  private isPreloaded = false;
  private unlockListenersAttached = false;
  private lifecycleAttached = false;
  private lastPlayedAt = 0;
  private assetValid = false;
  private assetChecked = false;
  private validationPromise: Promise<boolean> | null = null;
  private warnedEmpty = false;
  private dedupCache = new Map<string, DedupEntry>();
  private dedupCleanupTimer: ReturnType<typeof setInterval> | null = null;
  private systemNotificationShownAt = 0;
  private hidden = false;

  private boundVisibility = () => this.onVisibilityChange();
  private boundPageShow = () => this.onPageShow();
  private boundPageHide = () => this.onPageHide();
  private boundFocus = () => this.onFocus();
  private boundBlur = () => this.onBlur();
  private boundAudioError = () => {
    this.assetValid = false;
    this.warnEmptyAsset("decode error");
  };

  static getInstance(): NotificationSoundService {
    if (!NotificationSoundService.instance) {
      NotificationSoundService.instance = new NotificationSoundService();
    }
    return NotificationSoundService.instance;
  }

  private constructor() {
    if (typeof window !== "undefined") {
      this.settings = readSettings();
      this.hidden = document.hidden;
    }
  }

  private emitSettingsChange(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("notification-settings-changed"));
  }

  private warnEmptyAsset(reason: string): void {
    if (!DEV || this.warnedEmpty) return;
    this.warnedEmpty = true;
    console.warn(`${DEV_WARN_EMPTY} (${reason})`);
  }

  private isEnabled(): boolean {
    return this.settings.notificationSoundEnabled && !this.sessionMuted;
  }

  private startDedupCleanup(): void {
    if (this.dedupCleanupTimer || typeof window === "undefined") return;
    this.dedupCleanupTimer = setInterval(() => this.pruneDedupCache(), 10_000);
  }

  private pruneDedupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.dedupCache) {
      if (now - entry.timestamp > DEDUP_TTL_MS) {
        this.dedupCache.delete(key);
      }
    }
  }

  private isDuplicateEvent(options?: PlayNotificationOptions): boolean {
    if (!options?.eventId && !options?.orderId) return false;
    const key = `${options.eventId ?? ""}:${options.orderId ?? ""}`;
    const existing = this.dedupCache.get(key);
    if (existing && Date.now() - existing.timestamp < DEDUP_TTL_MS) {
      return true;
    }
    this.dedupCache.set(key, { key, timestamp: Date.now() });
    return false;
  }

  private shouldPlayForVisibility(): boolean {
    if (!this.hidden) return true;
    return Date.now() - this.systemNotificationShownAt > SYSTEM_NOTIFICATION_GRACE_MS;
  }

  /** Call when a system/browser notification is displayed for the same event. */
  markSystemNotificationShown(): void {
    this.systemNotificationShownAt = Date.now();
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  enable(): void {
    this.settings.notificationSoundEnabled = true;
    writeSettings(this.settings);
    this.emitSettingsChange();
    this.preload();
  }

  disable(): void {
    this.settings.notificationSoundEnabled = false;
    writeSettings(this.settings);
    this.emitSettingsChange();
  }

  toggle(): boolean {
    if (this.settings.notificationSoundEnabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.settings.notificationSoundEnabled;
  }

  setVolume(value: number): void {
    this.settings.notificationVolume = clampVolume(value);
    writeSettings(this.settings);
    if (this.audio) this.audio.volume = this.settings.notificationVolume;
    this.emitSettingsChange();
  }

  mute(): void {
    this.sessionMuted = true;
    this.emitSettingsChange();
  }

  unmute(): void {
    this.sessionMuted = false;
    this.emitSettingsChange();
  }

  get muted(): boolean {
    return this.sessionMuted || !this.settings.notificationSoundEnabled;
  }

  get unlocked(): boolean {
    return this.isUnlocked;
  }

  get ready(): boolean {
    return this.assetValid;
  }

  subscribeSettings(listener: () => void): () => void {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener("notification-settings-changed", listener);
    return () => window.removeEventListener("notification-settings-changed", listener);
  }

  status(): NotificationSoundStatus {
    return {
      enabled: this.settings.notificationSoundEnabled,
      sessionMuted: this.sessionMuted,
      volume: this.settings.notificationVolume,
      unlocked: this.isUnlocked,
      ready: this.assetValid,
      preloaded: this.isPreloaded,
      hidden: this.hidden,
      lastPlayedAt: this.lastPlayedAt,
      settings: this.getSettings(),
    };
  }

  preload(): void {
    if (typeof window === "undefined") return;
    if (!this.settings.notificationSoundEnabled) return;
    if (this.isPreloaded) return;

    this.settings = readSettings();
    if (!this.settings.notificationSoundEnabled) return;

    this.attachLifecycleListeners();
    this.startDedupCleanup();

    if (!this.audio) {
      this.audio = new Audio(SOUND_URL);
      this.audio.preload = "auto";
      this.audio.volume = this.settings.notificationVolume;
      this.audio.addEventListener("error", this.boundAudioError);
    }

    this.attachUnlockListeners();
    this.isPreloaded = true;

    void this.validateAsset().then((valid) => {
      if (valid && this.audio) {
        this.audio.load();
      }
    });

    if (DEV) this.attachDevTools();
  }

  async validateAsset(): Promise<boolean> {
    if (this.assetChecked) return this.assetValid;
    if (this.validationPromise) return this.validationPromise;

    this.validationPromise = (async () => {
      if (typeof window === "undefined") {
        this.assetChecked = true;
        return false;
      }

      try {
        const res = await fetch(SOUND_URL, { method: "HEAD", cache: "no-store" });
        const length = Number(res.headers.get("content-length") ?? 0);

        if (!res.ok || length < MIN_ASSET_BYTES) {
          this.assetValid = false;
          this.warnEmptyAsset(`${length} bytes, status ${res.status}`);
        } else {
          this.assetValid = true;
          if (DEV) console.debug(`[NotificationSound] Asset OK (${length} bytes)`);
        }
      } catch {
        this.assetValid = false;
        this.warnEmptyAsset("HEAD request failed");
      }

      this.assetChecked = true;
      this.validationPromise = null;
      return this.assetValid;
    })();

    return this.validationPromise;
  }

  private attachUnlockListeners(): void {
    if (this.unlockListenersAttached || typeof window === "undefined") return;
    this.unlockListenersAttached = true;

    const onGesture = () => {
      void this.unlock();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("keydown", onGesture);
    };

    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("touchstart", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
  }

  private attachLifecycleListeners(): void {
    if (this.lifecycleAttached || typeof window === "undefined") return;
    this.lifecycleAttached = true;

    document.addEventListener("visibilitychange", this.boundVisibility);
    window.addEventListener("pageshow", this.boundPageShow);
    window.addEventListener("pagehide", this.boundPageHide);
    window.addEventListener("focus", this.boundFocus);
    window.addEventListener("blur", this.boundBlur);
  }

  private removeLifecycleListeners(): void {
    if (!this.lifecycleAttached || typeof window === "undefined") return;
    document.removeEventListener("visibilitychange", this.boundVisibility);
    window.removeEventListener("pageshow", this.boundPageShow);
    window.removeEventListener("pagehide", this.boundPageHide);
    window.removeEventListener("focus", this.boundFocus);
    window.removeEventListener("blur", this.boundBlur);
    this.lifecycleAttached = false;
  }

  private onVisibilityChange(): void {
    this.hidden = document.hidden;
  }

  private onPageShow(): void {
    this.hidden = document.hidden;
    this.settings = readSettings();
    if (this.audio) this.audio.volume = this.settings.notificationVolume;
  }

  private onPageHide(): void {
    this.hidden = true;
  }

  private onFocus(): void {
    this.hidden = false;
  }

  private onBlur(): void {
    this.hidden = document.hidden;
  }

  async unlock(): Promise<void> {
    if (this.isUnlocked) return;
    if (!this.settings.notificationSoundEnabled) return;
    if (!this.audio) this.preload();
    if (!this.audio) return;

    const valid = await this.validateAsset();
    if (!valid) return;

    try {
      await this.audio.play();
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isUnlocked = true;
    } catch (err) {
      if (DEV && !isBenignPlayError(err)) {
        console.debug("[NotificationSound] unlock failed", err);
      }
    }
  }

  async play(
    _type: NotificationSoundType = "default",
    options?: PlayNotificationOptions,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    this.settings = readSettings();
    if (!this.isEnabled()) return;

    const force = options?.force === true;

    if (!force) {
      if (!this.shouldPlayForVisibility()) return;
      if (this.isDuplicateEvent(options)) return;
    }

    if (!this.audio) this.preload();
    if (!this.audio) return;

    const valid = await this.validateAsset();
    if (!valid) return;

    if (!force && Date.now() - this.lastPlayedAt < THROTTLE_MS) return;

    try {
      this.audio.volume = this.settings.notificationVolume;
      this.audio.currentTime = 0;
      await this.audio.play();
      this.lastPlayedAt = Date.now();
    } catch (err) {
      if (DEV) {
        if (isBenignPlayError(err)) {
          console.debug("[NotificationSound] play blocked (gesture required)");
        } else {
          console.debug("[NotificationSound] play error", err);
        }
      }
    }
  }

  private attachDevTools(): void {
    if (!DEV || typeof window === "undefined") return;
    const w = window as Window & { notificationSoundDebug?: unknown };
    if (w.notificationSoundDebug) return;

    w.notificationSoundDebug = {
      play: (type?: NotificationSoundType) => this.play(type, { force: true }),
      mute: () => this.mute(),
      unmute: () => this.unmute(),
      status: () => this.status(),
      volume: (v?: number) =>
        v !== undefined ? this.setVolume(v) : this.settings.notificationVolume,
      unlock: () => this.unlock(),
      enable: () => this.enable(),
      disable: () => this.disable(),
    };
  }

  destroy(): void {
    this.removeLifecycleListeners();

    if (this.dedupCleanupTimer) {
      clearInterval(this.dedupCleanupTimer);
      this.dedupCleanupTimer = null;
    }

    this.dedupCache.clear();

    if (this.audio) {
      this.audio.removeEventListener("error", this.boundAudioError);
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }

    this.isUnlocked = false;
    this.isPreloaded = false;
    this.unlockListenersAttached = false;
    this.lastPlayedAt = 0;
    this.assetValid = false;
    this.assetChecked = false;
    this.validationPromise = null;
    this.warnedEmpty = false;
    this.sessionMuted = false;

    if (DEV && typeof window !== "undefined") {
      delete (window as Window & { notificationSoundDebug?: unknown }).notificationSoundDebug;
    }

    NotificationSoundService.instance = null;
  }
}

export const notificationSoundService = NotificationSoundService.getInstance();

export function playNotificationSound(
  type?: NotificationSoundType,
  options?: PlayNotificationOptions,
): Promise<void> {
  return notificationSoundService.play(type, options);
}
