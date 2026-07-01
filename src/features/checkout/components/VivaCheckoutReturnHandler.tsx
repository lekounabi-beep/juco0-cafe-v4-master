"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EspressoBackground } from "@/components/EspressoBackground";

export function hasVivaReturnParams(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has("s") ||
    searchParams.has("t") ||
    searchParams.has("eventId") ||
    searchParams.has("eci")
  );
}

/**
 * Viva Failure URL may point at /checkout (merchant dashboard config).
 * Forward all payment return query params to /order-success where track redirect runs.
 */
export function VivaCheckoutReturnRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const forwardedRef = useRef(false);

  useEffect(() => {
    if (forwardedRef.current) return;
    if (!hasVivaReturnParams(searchParams)) return;

    forwardedRef.current = true;
    const query = searchParams.toString();
    router.replace(query ? `/order-success?${query}` : "/order-success");
  }, [router, searchParams]);

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
        <p className="text-white/60">Επιβεβαίωση πληρωμής...</p>
      </main>
    </div>
  );
}
