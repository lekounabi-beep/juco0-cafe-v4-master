import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/config/site-metadata";

export const metadata: Metadata = {
  title: "Παρακολούθηση παραγγελίας",
  robots: NOINDEX_ROBOTS,
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
