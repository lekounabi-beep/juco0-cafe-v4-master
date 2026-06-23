/**
 * GPS Service
 * Production-grade GPS tracking with battery optimization and accuracy filtering
 */

import type { Coordinates } from '@/shared/types/common.types';
import { createLocationFilter, type LocationUpdate, type FilterConfig } from './location-filter.service';
import { createSpeedTracker, calculateSpeed, type SpeedTracker } from './speed.service';
import { recordDriverLocation } from '@/integrations/supabase/services/delivery.service';
import type { GPSLocationUpdate } from '@/features/delivery/types/delivery.types';

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
   * Start GPS tracking for a delivery
   */
  async startTracking(deliveryId: string, driverId: string): Promise<void> {
    if (this.isTracking) {
      console.warn('[GPSService] Already tracking');
      return;
    }

    try {
      // Check geolocation support
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      // Request permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        this.callbacks.onPermissionDenied?.();
        throw new Error('Geolocation permission denied');
      }

      this.deliveryId = deliveryId;
      this.driverId = driverId;
      this.isTracking = true;
      this.locationFilter.reset();
      this.speedTracker.clear();

      // Start watching position
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
      console.log('[GPSService] Tracking started for delivery:', deliveryId);
    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
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
    this.lastCoordinates = null;
    this.lastTimestamp = 0;

    this.callbacks.onTrackingStopped?.();
    console.log('[GPSService] Tracking stopped');
  }

  /**
   * Request geolocation permission
   */
  private async requestPermission(): Promise<string> {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state;
    }
    return 'granted'; // Assume granted if permissions API not available
  }

  /**
   * Handle successful position update
   */
  private async handlePositionSuccess(position: GeolocationPosition): Promise<void> {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    const timestamp = position.timestamp;

    const coordinates: Coordinates = {
      lat: latitude,
      lng: longitude,
    };

    const update: LocationUpdate = {
      coordinates,
      accuracy,
      heading: heading || 0,
      speed: speed || 0,
      timestamp,
    };

    // Filter the update
    if (!this.locationFilter.shouldAcceptUpdate(update)) {
      return;
    }

    // Calculate speed if not provided
    let calculatedSpeed = speed || 0;
    if (this.lastCoordinates && this.lastTimestamp) {
      calculatedSpeed = calculateSpeed(
        this.lastCoordinates,
        coordinates,
        timestamp - this.lastTimestamp
      );
    }

    // Update speed tracker
    this.speedTracker.addSample(calculatedSpeed, coordinates);

    // Update state
    this.lastCoordinates = coordinates;
    this.lastTimestamp = timestamp;

    // Upload to database if we have a delivery ID and driver ID
    if (this.deliveryId && this.driverId) {
      try {
        const locationUpdate: GPSLocationUpdate = {
          lat: coordinates.lat,
          lng: coordinates.lng,
          accuracy,
          speed: calculatedSpeed,
          heading: heading || 0,
          timestamp: new Date().toISOString(),
        };
        await recordDriverLocation(this.deliveryId, this.driverId, locationUpdate);
      } catch (error) {
        console.error('[GPSService] Failed to record location:', error);
      }
    }

    // Notify callback
    this.callbacks.onLocationUpdate?.({
      ...update,
      speed: calculatedSpeed,
    });
  }

  /**
   * Handle position error
   */
  private handlePositionError(error: GeolocationPositionError): void {
    console.error('[GPSService] Position error:', error);

    const errorMessage = this.getErrorMessage(error);
    const errorObj = new Error(errorMessage);

    if (error.code === error.PERMISSION_DENIED) {
      this.callbacks.onPermissionDenied?.();
      this.stopTracking();
    }

    this.callbacks.onError?.(errorObj);
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
   * Get last known coordinates
   */
  getLastCoordinates(): Coordinates | null {
    return this.lastCoordinates;
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

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Request geolocation permission
 */
export async function requestGeolocationPermission(): Promise<PermissionState> {
  if (!isGeolocationSupported()) {
    throw new Error('Geolocation not supported');
  }

  if ('permissions' in navigator) {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state;
  }

  return 'granted';
}
