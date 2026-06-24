/**
 * ETA Hook — derived ETA via useMemo (no state, no effects).
 */

import { useMemo } from 'react';
import { calculateETA, type ETAConfig, type ETAResult } from '../services/eta.service';
import type { Coordinates } from '@/shared/types/common.types';

export interface UseETAOptions {
  currentLocation: Coordinates | null;
  destination: Coordinates | null;
  averageSpeedMs: number;
  config?: Partial<ETAConfig>;
}

export function useETA({
  currentLocation,
  destination,
  averageSpeedMs,
  config,
}: UseETAOptions) {
  const etaResult = useMemo((): ETAResult | null => {
    if (
      currentLocation?.lat == null ||
      currentLocation?.lng == null ||
      destination?.lat == null ||
      destination?.lng == null
    ) {
      return null;
    }

    return calculateETA(
      { lat: currentLocation.lat, lng: currentLocation.lng },
      { lat: destination.lat, lng: destination.lng },
      averageSpeedMs,
      config
    );
  }, [
    currentLocation?.lat,
    currentLocation?.lng,
    destination?.lat,
    destination?.lng,
    averageSpeedMs,
    config?.arrivalThreshold,
    config?.minSpeedForCalculation,
    config?.maxSpeedForCalculation,
    config?.smoothingFactor,
  ]);

  return {
    etaResult,
    isArrived: etaResult?.isArrived ?? false,
  };
}
