"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut, Store } from "lucide-react";
import { EspressoBackground } from "@/components/EspressoBackground";
import { AdminNavigation } from "@/features/admin/components/AdminNavigation";
import { AdminContentContainer } from "@/features/admin/components/AdminContentContainer";

export function AdminShell({
  children,
  onLogout,
}: {
  children: ReactNode;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <AdminContentContainer className="py-3">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                J
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-white">Juco Admin</p>
                <p className="hidden text-xs text-white/45 md:block">Workspace dashboard</p>
              </div>
            </div>

            <div className="ml-auto hidden md:block">
              <AdminNavigation />
            </div>

            <div className="ml-auto flex items-center gap-2 md:ml-4">
              <Link
                href="/"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2 md:text-sm md:font-semibold"
                aria-label="Μετάβαση στο κατάστημα"
              >
                <Store className="h-4 w-4" />
                <span className="hidden md:inline">Store</span>
              </Link>
              <button
                type="button"
                onClick={() => void onLogout()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition hover:bg-white/10 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2 md:text-sm md:font-semibold"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </AdminContentContainer>
      </header>

      <div className="relative z-10 pb-24 md:pb-8">{children}</div>
    </div>
  );
}
