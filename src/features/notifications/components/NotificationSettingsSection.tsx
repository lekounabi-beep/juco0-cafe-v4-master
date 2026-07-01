"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Bell, Volume2 } from "lucide-react";
import { notificationSoundService } from "../services/notification-sound.service";

type NotificationSettingsSectionProps = {
  className?: string;
  compact?: boolean;
};

export function NotificationSettingsSection({
  className = "",
  compact = false,
}: NotificationSettingsSectionProps) {
  const enabled = useSyncExternalStore(
    notificationSoundService.subscribeSettings.bind(notificationSoundService),
    () => notificationSoundService.getSettings().notificationSoundEnabled,
    () => true,
  );

  const volume = useSyncExternalStore(
    notificationSoundService.subscribeSettings.bind(notificationSoundService),
    () => notificationSoundService.getSettings().notificationVolume,
    () => 0.7,
  );

  const volumePercent = Math.round(volume * 100);

  const handleEnabledChange = useCallback((checked: boolean) => {
    if (checked) notificationSoundService.enable();
    else notificationSoundService.disable();
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    notificationSoundService.setVolume(value / 100);
  }, []);

  const handleTest = useCallback(() => {
    void notificationSoundService.play("default", { force: true });
  }, []);

  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm ${
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5"
      } ${className}`}
    >
      <div className={`flex items-center gap-2 ${compact ? "mb-3" : "mb-4"}`}>
        <Bell className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-primary`} />
        <h2 className={`font-semibold text-white ${compact ? "text-sm" : "text-lg"}`}>
          Ήχοι ειδοποιήσεων
        </h2>
      </div>

      <label
        className={`flex cursor-pointer items-center gap-3 text-white/90 ${compact ? "text-xs" : "text-sm"}`}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleEnabledChange(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black/40 accent-primary"
        />
        Ενεργοποίηση ήχων
      </label>

      <div className={`${compact ? "mt-3" : "mt-4"} space-y-2 ${!enabled ? "opacity-50" : ""}`}>
        <div
          className={`flex items-center justify-between text-white/80 ${compact ? "text-xs" : "text-sm"}`}
        >
          <span className="inline-flex items-center gap-2">
            <Volume2 className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-primary`} />
            Ένταση
          </span>
          <span>{volumePercent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={volumePercent}
          disabled={!enabled}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <button
        type="button"
        onClick={handleTest}
        disabled={!enabled}
        className={`inline-flex items-center gap-2 rounded-full bg-white/10 font-medium text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? "mt-3 px-3 py-1.5 text-xs" : "mt-4 px-4 py-2 text-sm"
        }`}
      >
        Δοκιμή ήχου
      </button>
    </section>
  );
}
