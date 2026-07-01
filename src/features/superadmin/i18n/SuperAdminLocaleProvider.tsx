"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMessage,
  type MessageValues,
  type SuperAdminMessageKey,
} from "@/features/superadmin/i18n/messages";
import {
  SUPERADMIN_LOCALE_STORAGE_KEY,
  type SuperAdminLocale,
} from "@/features/superadmin/i18n/types";

type SuperAdminLocaleContextValue = {
  locale: SuperAdminLocale;
  setLocale: (locale: SuperAdminLocale) => void;
  t: (key: SuperAdminMessageKey, values?: MessageValues) => string;
};

const SuperAdminLocaleContext = createContext<SuperAdminLocaleContextValue | null>(
  null,
);

function readStoredLocale(): SuperAdminLocale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(SUPERADMIN_LOCALE_STORAGE_KEY);
  return stored === "el" ? "el" : "en";
}

export function SuperAdminLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SuperAdminLocale>("en");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: SuperAdminLocale) => {
    setLocaleState(next);
    window.localStorage.setItem(SUPERADMIN_LOCALE_STORAGE_KEY, next);
    document.documentElement.lang = next === "el" ? "el" : "en";
  }, []);

  const t = useCallback(
    (key: SuperAdminMessageKey, values?: MessageValues) =>
      getMessage(locale, key, values),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <SuperAdminLocaleContext.Provider value={value}>
      {children}
    </SuperAdminLocaleContext.Provider>
  );
}

export function useSuperAdminT() {
  const context = useContext(SuperAdminLocaleContext);
  if (!context) {
    throw new Error("useSuperAdminT must be used within SuperAdminLocaleProvider");
  }
  return context;
}
