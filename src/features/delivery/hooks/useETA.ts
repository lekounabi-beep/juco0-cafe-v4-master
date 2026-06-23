/**
 * ETA Hook
 * React hook for calculating estimated time of arrival
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createETACalculator, type ETACalculator, type ETAConfig, type ETAResult } from '../services/eta.service';
import type { Coordinates } from '@/shared/types/common.types';

export interface UseETAOptions {
  currentLocation: Coordinates | null;
  destination: Coordinates | null;
  averageSpeedMs: number;
  config?: Partial<ETAConfig>;
}

export function useETA(options: UseETAOptions) {
  const {
    currentLocation,
    destination,
    averageSpeedMs,
    config,
  } = options;

  const [etaResult, setEtaResult] = useState<ETAResult | null>(null);
  const [isArrived, setIsArrived] = useState(false);

  const etaCalculatorRef = useRef<ETACalculator | null>(null);

  // Initialize ETA calculator
  useEffect(() => {
    etaCalculatorRef.current = createETACalculator(config);

    return () => {
      etaCalculatorRef.current = null;
    };
  }, [config]);

  // Calculate ETA when location, destination, or speed changes
  useEffect(() => {
    if (!currentLocation || !destination || !etaCalculatorRef.current) {
      return;
    }

    const result = etaCalculatorRef.current.calculateETA(
      currentLocation,
      destination,
      averageSpeedMs
    );

    setEtaResult(result);
    setIsArrived(result.isArrived);
  }, [currentLocation, destination, averageSpeedMs]);

  const calculateETA = useCallback((
    currentLoc: Coordinates,
    dest: Coordinates,
    speed: number
  ): ETAResult => {
    if (!etaCalculatorRef.current) {
      return {
        eta: null,
        remainingDistance: 0,
        remainingTime: 0,
        averageSpeed: speed,
        isArrived: false,
      };
    }

    return etaCalculatorRef.current.calculateETA(currentLoc, dest, speed);
  }, []);

  const checkArrival = useCallback((
    currentLoc: Coordinates,
    dest: Coordinates
  ): boolean => {
    if (!etaCalculatorRef.current) {
      return false;
    }

    return etaCalculatorRef.current.isArrived(currentLoc, dest);
  }, []);

  const reset = useCallback(() => {
    if (etaCalculatorRef.current) {
      etaCalculatorRef.current.reset();
    }
    setEtaResult(null);
    setIsArrived(false);
  }, []);

  return {
    etaResult,
    isArrived,
    calculateETA,
    checkArrival,
    reset,
  };
}
