/**
 * GPS Hook
 * React hook for GPS tracking during deliveries
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createGPSService, type GPSService, type GPSConfig, type GPSCallbacks, requestGeolocationPermission, type GeolocationPermissionResult, type StartTrackingOptions } from '../services/gps.service';
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
  onLocationPersist?: (result: {
    success: boolean;
    localFallback: { lat: number; lng: number } | null;
  }) => void;
}

export interface StartGPSTrackingOptions extends StartTrackingOptions {
  deliveryId?: string;
  driverId?: string;
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
    onLocationPersist,
  } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastLocation, setLastLocation] = useState<LocationUpdate | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const gpsServiceRef = useRef<GPSService | null>(null);
  const trackingSessionRef = useRef<string | null>(null);
  const callbacksRef = useRef({
    onLocationUpdate,
    onError,
    onPermissionDenied,
    onTrackingStarted,
    onTrackingStopped,
    onLocationPersist,
  });

  callbacksRef.current = {
    onLocationUpdate,
    onError,
    onPermissionDenied,
    onTrackingStarted,
    onTrackingStopped,
    onLocationPersist,
  };

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
        callbacksRef.current.onLocationUpdate?.(update);
      },
      onError: (err) => {
        setError(err);
        callbacksRef.current.onError?.(err);
      },
      onPermissionDenied: () => {
        callbacksRef.current.onPermissionDenied?.();
      },
      onTrackingStarted: () => {
        setIsTracking(true);
        callbacksRef.current.onTrackingStarted?.();
      },
      onTrackingStopped: () => {
        setIsTracking(false);
        callbacksRef.current.onTrackingStopped?.();
      },
      onLocationPersist: (result) => {
        callbacksRef.current.onLocationPersist?.(result);
      },
    };

    gpsServiceRef.current = createGPSService(config, callbacks);

    return () => {
      if (gpsServiceRef.current) {
        gpsServiceRef.current.stopTracking();
      }
    };
  }, [config]);

  const stopTracking = useCallback(() => {
    if (gpsServiceRef.current) {
      gpsServiceRef.current.stopTracking();
    }
    trackingSessionRef.current = null;
  }, []);

  const startTracking = useCallback(async (options: StartGPSTrackingOptions = {}) => {
    const resolvedDeliveryId = options.deliveryId ?? deliveryId;
    const resolvedDriverId = options.driverId ?? driverId;

    if (!gpsServiceRef.current || !resolvedDeliveryId || !resolvedDriverId) {
      return;
    }

    const sessionKey = `${resolvedDeliveryId}:${resolvedDriverId}`;
    if (trackingSessionRef.current === sessionKey && gpsServiceRef.current.isCurrentlyTracking()) {
      return;
    }

    if (trackingSessionRef.current && trackingSessionRef.current !== sessionKey) {
      gpsServiceRef.current.stopTracking();
    }

    await gpsServiceRef.current.startTracking(resolvedDeliveryId, resolvedDriverId, {
      skipPermissionRequest: options.skipPermissionRequest,
    });
    if (gpsServiceRef.current.isCurrentlyTracking()) {
      trackingSessionRef.current = sessionKey;
      const immediate = await gpsServiceRef.current.fetchCurrentPosition();
      if (immediate) {
        setLastLocation(immediate);
      }
    }
  }, [deliveryId, driverId]);

  const requestPermission = useCallback(async (): Promise<GeolocationPermissionResult> => {
    if (!isGeolocationSupported()) {
      return 'unsupported';
    }
    if (gpsServiceRef.current) {
      return gpsServiceRef.current.requestPermission();
    }
    return requestGeolocationPermission();
  }, []);

  const getLastKnownPosition = useCallback(() => {
    if (!gpsServiceRef.current) {
      return null;
    }
    return gpsServiceRef.current.getLastKnownPosition();
  }, []);

  const fetchCurrentPosition = useCallback(async () => {
    if (!gpsServiceRef.current) {
      return null;
    }
    const update = await gpsServiceRef.current.fetchCurrentPosition();
    if (update) {
      setLastLocation(update);
    }
    return update;
  }, []);

  const getSpeedStats = useCallback(() => {
    if (!gpsServiceRef.current) {
      return null;
    }
    return gpsServiceRef.current.getSpeedStats();
  }, []);

  const getLastCoordinates = useCallback(() => {
    return getLastKnownPosition();
  }, [getLastKnownPosition]);

  return {
    isTracking,
    isSupported,
    lastLocation,
    error,
    startTracking,
    stopTracking,
    requestPermission,
    getLastKnownPosition,
    fetchCurrentPosition,
    getSpeedStats,
    getLastCoordinates,
  };
}
