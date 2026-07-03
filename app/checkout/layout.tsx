import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/config/site-metadata";

export const metadata: Metadata = {
  title: "Ολοκλήρωση παραγγελίας",
  robots: NOINDEX_ROBOTS,
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
