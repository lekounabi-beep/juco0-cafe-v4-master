"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isSuperAdminEnabled } from "@/features/superadmin/config/superadmin-flag";
import { verifyAdminCookie } from "@app/actions/admin-auth";

export function SuperAdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const enabled = isSuperAdminEnabled();
  const [checked, setChecked] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function verifyAccess() {
      const cookieOk = await verifyAdminCookie();

      if (cancelled) return;

      if (!cookieOk) {
        router.replace("/admin/login?redirect=/superadmin");
        return;
      }

      setChecked(true);
    }

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [enabled, router]);

  if (!enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Juco SuperAdmin
          </p>
          <h1 className="text-2xl font-semibold text-white">Console disabled</h1>
          <p className="text-sm text-zinc-400">
            Set <code className="text-zinc-300">NEXT_PUBLIC_SUPERADMIN_ENABLED=true</code> to enable
            the internal operations console. Admin login is required when enabled.
          </p>
        </div>
      </div>
    );
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-600 border-t-zinc-200" />
      </div>
    );
  }

  return <>{children}</>;
}
