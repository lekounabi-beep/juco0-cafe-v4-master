import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/config/site-metadata";
import { AdminGuard } from "@/features/admin/components/AdminGuard";

export const metadata: Metadata = {
  title: "Admin",
  robots: NOINDEX_ROBOTS,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
