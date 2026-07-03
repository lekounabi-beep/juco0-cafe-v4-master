"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAdminSessionActive, clearAdminSession, setAdminSession } from "@/lib/auth/admin-session";
import { adminLogout, verifyAdminCookie } from "../../../../app/actions/admin-auth";
import { AdminShell } from "@/features/admin/components/AdminShell";

function resolveSafeAdminRedirect(raw: string | null): string {
  if (!raw) return "/admin";

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/admin";
  }

  if (trimmed.includes("://")) {
    return "/admin";
  }

  if (trimmed === "/admin/login" || trimmed.startsWith("/admin/login?")) {
    return "/admin";
  }

  return trimmed;
}

function readRedirectParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("redirect");
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      const cookieOk = await verifyAdminCookie();

      if (cancelled) return;

      if (isLoginPage) {
        if (cookieOk) {
          setAdminSession();
          router.replace(resolveSafeAdminRedirect(readRedirectParam()));
        }
        setChecked(true);
        return;
      }

      if (!cookieOk) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (!isAdminSessionActive()) {
        setAdminSession();
      }

      setChecked(true);
    }

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    await adminLogout();
    clearAdminSession();
    window.location.assign("/admin/login");
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return <AdminShell onLogout={handleLogout}>{children}</AdminShell>;
}
