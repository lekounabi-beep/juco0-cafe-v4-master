"use client";

import type { ReactNode } from "react";
import { isSuperAdminEnabled } from "@/features/superadmin/config/superadmin-flag";

export function SuperAdminGuard({ children }: { children: ReactNode }) {
  if (!isSuperAdminEnabled()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Juco SuperAdmin
          </p>
          <h1 className="text-2xl font-semibold text-white">Console disabled</h1>
          <p className="text-sm text-zinc-400">
            Set <code className="text-zinc-300">NEXT_PUBLIC_SUPERADMIN_ENABLED=true</code> to enable
            the internal operations console. Authentication will be added in a future release.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
