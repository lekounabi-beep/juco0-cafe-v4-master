import { SuperAdminGuard } from "@/features/superadmin/components/SuperAdminGuard";
import { SuperAdminShell } from "@/features/superadmin/components/SuperAdminShell";

export const metadata = {
  title: "Juco SuperAdmin",
  description: "Internal Juco platform operations console",
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminGuard>
      <SuperAdminShell>{children}</SuperAdminShell>
    </SuperAdminGuard>
  );
}
