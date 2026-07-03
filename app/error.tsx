"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureException } from "@/lib/monitoring";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { boundary: "app.error" });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold">Κάτι πήγε στραβά</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Προέκυψε απρόσμενο σφάλμα. Δοκιμάστε ξανά ή επιστρέψτε στην αρχική.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Δοκιμή ξανά
        </button>
        <Link href="/" className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Πίσω στο μενού
        </Link>
      </div>
    </main>
  );
}
