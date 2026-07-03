"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { boundary: "app.global-error" });
  }, [error]);

  return (
    <html lang="el">
      <body className="min-h-screen bg-background font-sans text-foreground">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-semibold">Κρίσιμο σφάλμα</h1>
          <p className="max-w-sm text-sm opacity-80">
            Η εφαρμογή αντιμετώπισε σφάλμα. Ανανεώστε τη σελίδα ή δοκιμάστε ξανά.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Δοκιμή ξανά
          </button>
        </main>
      </body>
    </html>
  );
}
