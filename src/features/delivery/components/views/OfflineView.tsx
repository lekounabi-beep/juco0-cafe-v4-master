"use client";

import { Loader2, Power } from "lucide-react";
import { DRIVER_AVAILABILITY } from "../../types/delivery.types";

interface OfflineViewProps {
  availabilityLoading: boolean;
  onAvailabilityChange: (newAvailability: string) => void;
}

export function OfflineView({ availabilityLoading, onAvailabilityChange }: OfflineViewProps) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col px-4 py-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold text-white/70">
          <span aria-hidden>⚫</span> Εκτός βάρδιας
        </p>
        <p className="mt-3 text-base text-white/50">Δεν λαμβάνεις παραγγελίες</p>
      </div>

      <button
        type="button"
        disabled={availabilityLoading}
        onClick={() => onAvailabilityChange(DRIVER_AVAILABILITY.ONLINE)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {availabilityLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Power className="h-5 w-5" aria-hidden />
        )}
        ΞΕΚΙΝΑ ΒΑΡΔΙΑ
      </button>
    </div>
  );
}
