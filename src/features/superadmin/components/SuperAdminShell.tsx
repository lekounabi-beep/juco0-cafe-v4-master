"use client";

import type { ReactNode } from "react";
import { SuperAdminContentContainer } from "@/features/superadmin/components/SuperAdminContentContainer";
import {
  SuperAdminSidebar,
  SuperAdminTopBar,
} from "@/features/superadmin/components/SuperAdminSidebar";
import { SuperAdminLocaleProvider } from "@/features/superadmin/i18n/SuperAdminLocaleProvider";

export function SuperAdminShell({ children }: { children: ReactNode }) {
  return (
    <SuperAdminLocaleProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <SuperAdminSidebar />
        <div className="lg:pl-60">
          <SuperAdminTopBar />
          <main className="py-6 lg:py-8">
            <SuperAdminContentContainer>{children}</SuperAdminContentContainer>
          </main>
        </div>
      </div>
    </SuperAdminLocaleProvider>
  );
}
