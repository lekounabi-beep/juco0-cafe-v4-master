/**
 * Empty Cart component
 */

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { EspressoBackground } from "@/components/EspressoBackground";

export function EmptyCart() {
  return (
    <div className="relative grid min-h-screen place-items-center px-4 text-foreground">
      <EspressoBackground />
      <div className="relative z-10 max-w-md rounded-3xl glass p-8 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-white/50" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-white">Το καλάθι σου είναι άδειο</h1>
        <p className="mt-2 text-sm text-white/65">Πρόσθετε προϊόντα από το μενού για να συνεχίσετε.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          Δες το μενού
        </Link>
      </div>
    </div>
  );
}
