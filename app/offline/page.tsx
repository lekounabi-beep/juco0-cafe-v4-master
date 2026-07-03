"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Home, RefreshCw, WifiOff } from "lucide-react";
import { EspressoBackground } from "@/components/EspressoBackground";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflinePage() {
  const { isOnline } = useNetworkStatus();

  const handleRetry = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 text-center shadow-xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
            <WifiOff className="h-7 w-7 text-amber-300" />
          </div>

          <h1 className="font-display text-xl font-semibold text-white">You&apos;re offline</h1>
          <p className="mt-2 text-sm text-white/65">
            {isOnline
              ? "Connection restored — you can head back to the menu."
              : "Check your connection and try again."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Home className="h-4 w-4" />
              Back to menu
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
