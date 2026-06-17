/**
 * Location Button component - gets user's current location
 */

import { Locate, Loader2 } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';

interface LocationButtonProps {
  onLocationFound?: (coords: { lat: number; lng: number }) => void;
}

export function LocationButton({ onLocationFound }: LocationButtonProps) {
  const { locating, locError, getLocation } = useLocation();

  const handleClick = () => {
    getLocation((coords) => {
      if (onLocationFound) {
        onLocationFound(coords);
      }
    });
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={locating}
        className="absolute bottom-4 right-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-50"
        aria-label="Η τοποθεσία μου"
      >
        {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Locate className="h-5 w-5" />}
      </button>
      {locError && <p className="text-xs text-destructive mt-2">{locError}</p>}
    </>
  );
}
