// @ts-nocheck
/**
 * Google Map component — legacy; active flows use MapEngine
 */

import { forwardRef, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useMapsStore } from '../store/maps-store';

interface GoogleMapProps {
  shouldInitialize?: boolean;
  className?: string;
  onMapReady?: () => void;
}

export const GoogleMap = forwardRef<HTMLDivElement, GoogleMapProps>(
  ({ shouldInitialize = true, className = '', onMapReady }, ref) => {
    const { isMapLoaded, loadError } = useMapsStore();
    const internalRef = useRef<HTMLDivElement>(null);
    const mapRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;
    useGoogleMaps(mapRef, shouldInitialize);

    useEffect(() => {
      if (isMapLoaded && onMapReady) {
        onMapReady();
      }
    }, [isMapLoaded, onMapReady]);

    return (
      <div className={`relative ${className}`}>
        <div 
          ref={mapRef} 
          className="h-full w-full"
          id="map"
        />
        
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-white/70">Φόρτωση χάρτη...</p>
            </div>
          </div>
        )}
        
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            <p className="text-sm text-destructive">{loadError}</p>
          </div>
        )}
      </div>
    );
  }
);

GoogleMap.displayName = 'GoogleMap';
