'use client';

import { MapPin } from 'lucide-react';

export function AddressMarker({ lifted }: { lifted: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full">
      <div
        className={`transition-transform duration-150 ${lifted ? '-translate-y-1 scale-95' : 'translate-y-0 scale-100'}`}
        style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }}
      >
        <MapPin className="h-7 w-7 text-red-500" fill="currentColor" />
      </div>
      <div className="mx-auto mt-[-3px] h-1.5 w-1.5 rounded-full bg-white/80 shadow" />
    </div>
  );
}
