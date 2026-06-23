/**
 * GPS Hook
 * React hook for GPS tracking during deliveries
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createGPSService, type GPSService, type GPSConfig, type GPSCallbacks } from '../services/gps.service';
import { type LocationUpdate } from '../services/location-filter.service';
import { isGeolocationSupported } from '../services/gps.service';

export interface UseGPSOptions {
  deliveryId: string | null;
  driverId: string | null;
  config?: Partial<GPSConfig>;
  onLocationUpdate?: (update: LocationUpdate) => void;
  onError?: (error: Error) => void;
  onPermissionDenied?: () => void;
  onTrackingStarted?: () => void;
  onTrackingStopped?: () => void;
}

export function useGPS(options: UseGPSOptions) {
  const {
    deliveryId,
    driverId,
    config,
    onLocationUpdate,
    onError,
    onPermissionDenied,
    onTrackingStarted,
    onTrackingStopped,
  } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastLocation, setLastLocation] = useState<LocationUpdate | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const gpsServiceRef = useRef<GPSService | null>(null);

  // Initialize GPS service
  useEffect(() => {
    setIsSupported(isGeolocationSupported());

    if (!isGeolocationSupported()) {
      setError(new Error('Geolocation not supported'));
      return;
    }

    const callbacks: GPSCallbacks = {
      onLocationUpdate: (update) => {
        setLastLocation(update);
        onLocationUpdate?.(update);
      },
      onError: (err) => {
        setError(err);
        onError?.(err);
      },
      onPermissionDenied: () => {
        onPermissionDenied?.();
      },
      onTrackingStarted: () => {
        setIsTracking(true);
        onTrackingStarted?.();
      },
      onTrackingStopped: () => {
        setIsTracking(false);
        onTrackingStopped?.();
      },
    };

    gpsServiceRef.current = createGPSService(config, callbacks);

    return () => {
      if (gpsServiceRef.current) {
        gpsServiceRef.current.stopTracking();
      }
    };
  }, [config]);

  // Start/stop tracking based on delivery ID and driver ID
  useEffect(() => {
    if (!gpsServiceRef.current || !deliveryId || !driverId) {
      return;
    }

    const startTracking = async () => {
      try {
        await gpsServiceRef.current!.startTracking(deliveryId, driverId);
      } catch (err) {
        setError(err as Error);
      }
    };

    startTracking();

    return () => {
      if (gpsServiceRef.current) {
        gpsServiceRef.current.stopTracking();
      }
    };
  }, [deliveryId, driverId]);

  const startTracking = useCallback(async () => {
    if (!gpsServiceRef.current || !deliveryId || !driverId) {
      throw new Error('GPS service not initialized or missing delivery/driver ID');
    }

    try {
      await gpsServiceRef.current.startTracking(deliveryId, driverId);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [deliveryId, driverId]);

  const stopTracking = useCallback(() => {
    if (gpsServiceRef.current) {
      gpsServiceRef.current.stopTracking();
    }
  }, []);

  const getSpeedStats = useCallback(() => {
    if (!gpsServiceRef.current) {
      return null;
    }
    return gpsServiceRef.current.getSpeedStats();
  }, []);

  const getLastCoordinates = useCallback(() => {
    if (!gpsServiceRef.current) {
      return null;
    }
    return gpsServiceRef.current.getLastCoordinates();
  }, []);

  return {
    isTracking,
    isSupported,
    lastLocation,
    error,
    startTracking,
    stopTracking,
    getSpeedStats,
    getLastCoordinates,
  };
}
