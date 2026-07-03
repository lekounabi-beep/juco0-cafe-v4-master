import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/config/site-metadata";

export const metadata: Metadata = {
  title: "Η παραγγελία ολοκληρώθηκε",
  robots: NOINDEX_ROBOTS,
};

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
