import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/config/site-metadata";

export const metadata: Metadata = {
  title: "Εγγραφή",
  robots: NOINDEX_ROBOTS,
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
