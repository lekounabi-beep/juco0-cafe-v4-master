import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/config/site-metadata";
import { SuperAdminGuard } from "@/features/superadmin/components/SuperAdminGuard";
import { SuperAdminShell } from "@/features/superadmin/components/SuperAdminShell";

export const metadata: Metadata = {
  title: "Juco SuperAdmin",
  description: "Internal Juco platform operations console",
  robots: NOINDEX_ROBOTS,
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminGuard>
      <SuperAdminShell>{children}</SuperAdminShell>
    </SuperAdminGuard>
  );
}
