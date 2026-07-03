import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/config/site-metadata";

export const metadata: Metadata = {
  title: "Ο λογαριασμός μου",
  robots: NOINDEX_ROBOTS,
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
