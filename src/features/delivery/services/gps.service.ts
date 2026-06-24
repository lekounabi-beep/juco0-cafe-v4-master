/**
 * GPS Service
 * Production-grade GPS tracking with battery optimization and accuracy filtering
 */

import type { Coordinates } from '@/shared/types/common.types';
import { createLocationFilter, type LocationUpdate, type FilterConfig } from './location-filter.service';
import { createSpeedTracker, calculateSpeed, type SpeedTracker } from './speed.service';
import { recordDriverLocationWithOffline } from '@/features/delivery/services/driver-offline-actions';
import { pushDriverGpsToMapStore } from '@/features/delivery/services/driver-map-gps-bridge';
import { isUUID } from '@/shared/utils/uuid';

export interface GPSConfig {
  updateInterval: number; // Minimum time between updates in ms (default: 15s)
  enableHighAccuracy: boolean; // Enable high accuracy mode (default: true)
  timeout: number; // GPS timeout in ms (default: 10000)
  maximumAge: number; // Maximum age of cached position in ms (default: 0)
  filterConfig?: Partial<FilterConfig>; // Location filter configuration
}

export const DEFAULT_GPS_CONFIG: GPSConfig = {
  updateInterval: 15000, // 15 seconds
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  filterConfig: {
    minAccuracy: 50,
    maxAccuracy: 500,
    minTimeBetweenUpdates: 10000, // 10 seconds
    minDistanceBetweenUpdates: 10, // 10 meters
    minHeadingChange: 20, // 20 degrees
    maxJumpDistance: 500, // 500 meters
  },
};

export interface GPSCallbacks {
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

export interface StartTrackingOptions {
  /** Skip permission prompt when SSOT already confirmed granted */
  skipPermissionRequest?: boolean;
}

/**
 * GPS tracking service
 */
export class GPSService {
  private watchId: number | null = null;
  private isTracking = false;
  private locationFilter = createLocationFilter();
  private speedTracker = createSpeedTracker();
  private config: GPSConfig;
  private callbacks: GPSCallbacks;
  private lastCoordinates: Coordinates | null = null;
  private lastTimestamp: number = 0;
  private deliveryId: string | null = null;
  private driverId: string | null = null;

  constructor(config: Partial<GPSConfig> = {}, callbacks: GPSCallbacks = {}) {
    this.config = { ...DEFAULT_GPS_CONFIG, ...config };
    if (config.filterConfig) {
      this.locationFilter.updateConfig(config.filterConfig);
    }
    this.callbacks = callbacks;
  }

  /**
   * Request geolocation permission (triggers browser prompt when needed).
   */
  async requestPermission(): Promise<GeolocationPermissionResult> {
    return requestGeolocationPermission();
  }

  /**
   * Start GPS tracking for a delivery
   */
  async startTracking(
    deliveryId: string,
    driverId: string,
    options: StartTrackingOptions = {}
  ): Promise<void> {
    if (this.isTracking) {
      if (this.deliveryId === deliveryId && this.driverId === driverId) {
        return;
      }
      this.stopTracking();
    }

    if (!isGeolocationSupported()) {
      this.callbacks.onError?.(new Error('Geolocation not supported'));
      return;
    }

    if (!options.skipPermissionRequest) {
      const permission = await this.requestPermission();
      if (permission === 'unsupported') {
        this.callbacks.onError?.(new Error('Geolocation not supported'));
        return;
      }
      if (permission === 'denied') {
        this.callbacks.onPermissionDenied?.();
        return;
      }
    }

    try {
      this.deliveryId = deliveryId;
      this.driverId = driverId;
      this.isTracking = true;
      this.locationFilter.reset();
      this.speedTracker.clear();

      this.watchId = navigator.geolocation.watchPosition(
        this.handlePositionSuccess.bind(this),
        this.handlePositionError.bind(this),
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge,
        }
      );

      this.callbacks.onTrackingStarted?.();
      void this.fetchCurrentPosition();
    } catch (error) {
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Stop GPS tracking
   */
  stopTracking(): void {
    if (!this.isTracking || this.watchId === null) {
      return;
    }

    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.isTracking = false;
    this.deliveryId = null;
    this.driverId = null;
    this.lastCoordinates = null;
    this.lastTimestamp = 0;

    this.callbacks.onTrackingStopped?.();
  }

  /**
   * Handle successful position update
   */
  private positionToUpdate(position: GeolocationPosition): LocationUpdate {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    return {
      coordinates: { lat: latitude, lng: longitude },
      accuracy,
      heading: heading || 0,
      speed: speed || 0,
      timestamp: position.timestamp,
    };
  }

  private applyAcceptedUpdate(update: LocationUpdate): void {
    const { coordinates, accuracy, heading, speed, timestamp } = update;

    let calculatedSpeed = speed || 0;
    if (this.lastCoordinates && this.lastTimestamp) {
      calculatedSpeed = calculateSpeed(
        this.lastCoordinates,
        coordinates,
        timestamp - this.lastTimestamp
      );
    }

    this.speedTracker.addSample(calculatedSpeed, coordinates);
    this.lastCoordinates = coordinates;
    this.lastTimestamp = timestamp;

    if (
      this.deliveryId &&
      this.driverId &&
      isUUID(this.deliveryId) &&
      isUUID(this.driverId)
    ) {
      void recordDriverLocationWithOffline(this.deliveryId, this.driverId, {
        lat: coordinates.lat,
        lng: coordinates.lng,
        accuracy,
        speed: calculatedSpeed,
        heading: heading || 0,
        timestamp: new Date().toISOString(),
      }).then((result) => {
        this.callbacks.onLocationPersist?.(result);
      });
    }

    this.callbacks.onLocationUpdate?.({
      ...update,
      speed: calculatedSpeed,
    });
  }

  private async handlePositionSuccess(position: GeolocationPosition): Promise<void> {
    const update = this.positionToUpdate(position);
    const accepted = this.locationFilter.shouldAcceptUpdate(update);

    pushDriverGpsToMapStore(
      update.coordinates,
      update.heading ?? 0,
      update.accuracy,
      accepted
    );

    if (!accepted) {
      return;
    }

    this.applyAcceptedUpdate(update);
  }

  /**
   * One-shot position fetch — does not wait for watchPosition.
   * Used to hydrate map immediately on delivery start / refresh.
   */
  async fetchCurrentPosition(): Promise<LocationUpdate | null> {
    if (!isGeolocationSupported()) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const update = this.positionToUpdate(position);
          const accepted = this.locationFilter.shouldAcceptUpdate(update);
          pushDriverGpsToMapStore(
            update.coordinates,
            update.heading ?? 0,
            update.accuracy,
            accepted
          );
          if (accepted) {
            this.applyAcceptedUpdate(update);
          }
          resolve(update);
        },
        () => resolve(null),
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: 5000,
        }
      );
    });
  }

  /**
   * Last valid coordinates from GPS service (same source customer DB rows originate from).
   */
  getLastKnownPosition(): Coordinates | null {
    return this.lastCoordinates;
  }

  /**
   * @deprecated Use getLastKnownPosition()
   */
  getLastCoordinates(): Coordinates | null {
    return this.getLastKnownPosition();
  }

  /**
   * Handle position error
   */
  private handlePositionError(error: GeolocationPositionError): void {
    if (error.code === error.PERMISSION_DENIED) {
      this.callbacks.onPermissionDenied?.();
      this.stopTracking();
      return;
    }

    console.error('[GPSService] Position error:', error);
    const errorMessage = this.getErrorMessage(error);
    this.callbacks.onError?.(new Error(errorMessage));
  }

  /**
   * Get error message from GeolocationPositionError
   */
  private getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied';
      case error.POSITION_UNAVAILABLE:
        return 'Location unavailable';
      case error.TIMEOUT:
        return 'Location request timeout';
      default:
        return 'Unknown location error';
    }
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Get current speed statistics
   */
  getSpeedStats() {
    return this.speedTracker.getStats();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GPSConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.filterConfig) {
      this.locationFilter.updateConfig(config.filterConfig);
    }
  }

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: Partial<GPSCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

/**
 * Create a new GPS service instance
 */
export function createGPSService(
  config?: Partial<GPSConfig>,
  callbacks?: GPSCallbacks
): GPSService {
  return new GPSService(config, callbacks);
}

export type GeolocationPermissionResult = 'granted' | 'denied' | 'unsupported';

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/**
 * Request geolocation permission (triggers browser prompt when state is "prompt").
 * Never throws — returns result for UI handling.
 */
export async function requestGeolocationPermission(): Promise<GeolocationPermissionResult> {
  if (!isGeolocationSupported()) {
    return 'unsupported';
  }

  if ('permissions' in navigator) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (result.state === 'granted') return 'granted';
      if (result.state === 'denied') return 'denied';
    } catch {
      // fall through to getCurrentPosition prompt
    }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve('denied');
        } else {
          // Timeout/unavailable — permission may still be granted
          resolve('granted');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
