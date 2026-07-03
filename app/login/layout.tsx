import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/config/site-metadata";

export const metadata: Metadata = {
  title: "Σύνδεση",
  robots: NOINDEX_ROBOTS,
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
