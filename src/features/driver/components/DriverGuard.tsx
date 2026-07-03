"use client";

import { useEffect, useState } from "react";
import { clearDriverSession, getDriverSession } from "@/lib/auth/driver-session";
import { verifyDriverSession } from "../../../../app/actions/driver-login";
import { isUUID } from "@/shared/utils/uuid";

function hardRedirect(url: string): void {
  window.location.replace(url);
}

function GuardSpinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-white/70">Φόρτωση εφαρμογής οδηγού...</p>
      <a href="/driver/login" className="text-sm font-medium text-primary underline">
        Σύνδεση οδηγού
      </a>
    </div>
  );
}

export function DriverGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getDriverSession();

    if (!session || !isUUID(session.driver_id)) {
      clearDriverSession();
      hardRedirect("/driver/login");
      return;
    }

    verifyDriverSession().then((ok) => {
      if (!ok) {
        clearDriverSession();
        hardRedirect("/driver/login");
        return;
      }
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <GuardSpinner />;
  }

  return <>{children}</>;
}
