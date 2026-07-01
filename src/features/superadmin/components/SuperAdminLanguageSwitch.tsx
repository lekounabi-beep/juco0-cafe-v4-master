"use client";

import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuperAdminT } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";
import type { SuperAdminLocale } from "@/features/superadmin/i18n/types";

const OPTIONS: { locale: SuperAdminLocale; labelKey: "language.en" | "language.el" }[] = [
  { locale: "el", labelKey: "language.el" },
  { locale: "en", labelKey: "language.en" },
];

export function SuperAdminLanguageSwitch({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = useSuperAdminT();

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "rounded-lg border border-zinc-800 bg-zinc-900 p-1" : "",
      )}
      role="group"
      aria-label={t("language.label")}
    >
      {!compact ? (
        <Languages className="hidden h-4 w-4 text-zinc-500 sm:block" aria-hidden />
      ) : null}
      <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
        {OPTIONS.map((option) => {
          const active = locale === option.locale;
          return (
            <button
              key={option.locale}
              type="button"
              onClick={() => setLocale(option.locale)}
              className={cn(
                "min-w-[2.5rem] rounded-md px-2.5 py-1 text-xs font-semibold transition",
                active
                  ? "bg-zinc-100 text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
              aria-pressed={active}
            >
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
