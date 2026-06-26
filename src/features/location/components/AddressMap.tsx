'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { CheckoutAddress } from '../types/address';
import { useMapbox } from '../hooks/useMapbox';
import { AddressMarker } from './AddressMarker';

type AddressMapProps = {
  isOpen: boolean;
  target: { lat: number; lng: number } | null;
  initialAddress: CheckoutAddress | null;
  onMoveEnd: (coords: { lat: number; lng: number }) => void;
};

export function AddressMap({ isOpen, target, initialAddress, onMoveEnd }: AddressMapProps) {
  const [markerLifted, setMarkerLifted] = useState(false);
  const { containerRef, ready, error, flyTo } = useMapbox({
    enabled: isOpen,
    onMoveEnd: (coords) => {
      setMarkerLifted(false);
      onMoveEnd(coords);
    },
  });

  useEffect(() => {
    if (!ready || !isOpen) return;
    const next = target ?? initialAddress;
    if (!next) return;
    flyTo({ lat: next.lat, lng: next.lng });
  }, [ready, isOpen, target, initialAddress, flyTo]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-950">
      <div className="absolute inset-0" onPointerDown={() => setMarkerLifted(true)}>
        <div ref={containerRef} className="h-full w-full" />
      </div>
      <AddressMarker lifted={markerLifted} />

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
