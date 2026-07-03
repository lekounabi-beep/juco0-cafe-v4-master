"use client";

import { useEffect, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import type { CheckoutAddress } from "../types/address";
import { useMapbox } from "../hooks/useMapbox";
import { CheckoutMapPin } from "./CheckoutMapPin";

type AddressMapProps = {
  isOpen: boolean;
  target: { lat: number; lng: number } | null;
  initialAddress: CheckoutAddress | null;
  onMoveEnd: (coords: { lat: number; lng: number }) => void;
  onMoveStart?: () => void;
  initialView?: { lat: number; lng: number; zoom: number } | null;
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
  onCenterToCurrentLocation?: () => void;
  locationLoading?: boolean;
  showMapHelper?: boolean;
};

export function AddressMap({
  isOpen,
  target,
  initialAddress,
  onMoveEnd,
  onMoveStart,
  initialView,
  onViewChange,
  onCenterToCurrentLocation,
  locationLoading = false,
  showMapHelper = true,
}: AddressMapProps) {
  const [pinLifted, setPinLifted] = useState(false);
  const { containerRef, ready, error, flyTo } = useMapbox({
    enabled: isOpen,
    onMoveStart: () => {
      setPinLifted(true);
      onMoveStart?.();
    },
    onMoveEnd: (coords) => {
      setPinLifted(false);
      onMoveEnd(coords);
    },
    initialView,
    onViewChange,
  });

  useEffect(() => {
    if (!ready || !isOpen) return;
    const next = target ?? initialAddress;
    if (!next) return;
    flyTo({ lat: next.lat, lng: next.lng });
  }, [ready, isOpen, target, initialAddress, flyTo]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-950">
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/15 via-transparent to-black/10 opacity-80" />
      <div className="absolute inset-0" onPointerDown={() => setPinLifted(true)}>
        <div ref={containerRef} className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-black/18 backdrop-blur-[1px]">
          <div className="relative h-3.5 w-3.5">
            <span className="absolute left-1/2 top-0 h-3.5 w-px -translate-x-1/2 bg-white/35" />
            <span className="absolute left-0 top-1/2 h-px w-3.5 -translate-y-1/2 bg-white/35" />
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55 bg-white/20" />
          </div>
        </div>
      </div>
      <CheckoutMapPin lifted={pinLifted} />

      {showMapHelper && (
        <div className="pointer-events-none absolute left-1/2 top-[5.5rem] z-20 w-[min(92%,32rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-center text-xs text-white/75 backdrop-blur-md lg:top-20">
          Μετακίνησε τον χάρτη ώστε η καρφίτσα να βρίσκεται ακριβώς στην είσοδο του σημείου
          παράδοσης.
        </div>
      )}

      {onCenterToCurrentLocation && (
        <button
          type="button"
          onClick={onCenterToCurrentLocation}
          aria-label="Κέντρο στην τοποθεσία μου"
          className="absolute bottom-24 right-3 z-20 grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-black/65 text-white shadow-[0_16px_38px_rgba(0,0,0,0.32)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-black/75 active:scale-[0.98] motion-reduce:transform-none"
        >
          {locationLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Crosshair className="h-5 w-5 text-primary" />
          )}
        </button>
      )}

      {!ready && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-white/75 backdrop-blur-md">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-primary" />
            Φόρτωση χάρτη...
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 px-6 text-center">
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
