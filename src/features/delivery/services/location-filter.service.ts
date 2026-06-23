/**
 * Location Filter Service
 * Filter and validate GPS location updates
 */

import type { Coordinates } from '@/shared/types/common.types';
import { calculateDistance, areCoordinatesSame, isObviousJump } from './distance.service';

export interface LocationUpdate {
  coordinates: Coordinates;
  accuracy: number;
  heading: number;
  speed: number;
  timestamp: number;
}

export interface FilterConfig {
  minAccuracy: number; // Minimum accuracy in meters (default: 50m)
  maxAccuracy: number; // Maximum accuracy in meters (default: 500m)
  minTimeBetweenUpdates: number; // Minimum time between updates in ms (default: 10s)
  minDistanceBetweenUpdates: number; // Minimum distance between updates in meters (default: 10m)
  minHeadingChange: number; // Minimum heading change in degrees (default: 20°)
  maxJumpDistance: number; // Maximum allowed jump in meters (default: 500m)
}

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  minAccuracy: 50,
  maxAccuracy: 500,
  minTimeBetweenUpdates: 10000, // 10 seconds
  minDistanceBetweenUpdates: 10, // 10 meters
  minHeadingChange: 20, // 20 degrees
  maxJumpDistance: 500, // 500 meters
};

/**
 * Location filter for GPS updates
 */
class LocationFilter {
  private config: FilterConfig;
  private lastUpdate: LocationUpdate | null = null;

  constructor(config: Partial<FilterConfig> = {}) {
    this.config = { ...DEFAULT_FILTER_CONFIG, ...config };
  }

  /**
   * Check if a location update should be accepted
   */
  shouldAcceptUpdate(update: LocationUpdate): boolean {
    // Check accuracy
    if (!this.isAccuracyAcceptable(update.accuracy)) {
      console.log('[LocationFilter] Rejected: Poor accuracy', update.accuracy);
      return false;
    }

    // Check if coordinates are valid
    if (!this.areCoordinatesValid(update.coordinates)) {
      console.log('[LocationFilter] Rejected: Invalid coordinates');
      return false;
    }

    // Check if this is the first update
    if (!this.lastUpdate) {
      this.lastUpdate = update;
      return true;
    }

    // Check if enough time has passed
    if (!this.hasEnoughTimePassed(update.timestamp)) {
      // Check if distance threshold is met instead
      if (!this.hasMovedEnough(update.coordinates)) {
        // Check if heading has changed significantly
        if (!this.hasHeadingChangedEnough(update.heading)) {
          console.log('[LocationFilter] Rejected: Not enough change');
          return false;
        }
      }
    }

    // Check for obvious jump
    if (isObviousJump(this.lastUpdate.coordinates, update.coordinates, this.config.maxJumpDistance)) {
      console.log('[LocationFilter] Rejected: Obvious jump');
      return false;
    }

    // Accept the update
    this.lastUpdate = update;
    return true;
  }

  /**
   * Check if accuracy is acceptable
   */
  private isAccuracyAcceptable(accuracy: number): boolean {
    return accuracy >= this.config.minAccuracy && accuracy <= this.config.maxAccuracy;
  }

  /**
   * Check if coordinates are valid
   */
  private areCoordinatesValid(coordinates: Coordinates): boolean {
    const { lat, lng } = coordinates;
    return (
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180 &&
      !isNaN(lat) && !isNaN(lng)
    );
  }

  /**
   * Check if enough time has passed since last update
   */
  private hasEnoughTimePassed(timestamp: number): boolean {
    if (!this.lastUpdate) {
      return true;
    }
    const timeDiff = timestamp - this.lastUpdate.timestamp;
    return timeDiff >= this.config.minTimeBetweenUpdates;
  }

  /**
   * Check if driver has moved enough distance
   */
  private hasMovedEnough(coordinates: Coordinates): boolean {
    if (!this.lastUpdate) {
      return true;
    }
    const distance = calculateDistance(this.lastUpdate.coordinates, coordinates);
    return distance >= this.config.minDistanceBetweenUpdates;
  }

  /**
   * Check if heading has changed enough
   */
  private hasHeadingChangedEnough(heading: number): boolean {
    if (!this.lastUpdate) {
      return true;
    }
    const headingDiff = Math.abs(heading - this.lastUpdate.heading);
    const normalizedDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;
    return normalizedDiff >= this.config.minHeadingChange;
  }

  /**
   * Reset the filter state
   */
  reset(): void {
    this.lastUpdate = null;
  }

  /**
   * Get the last accepted update
   */
  getLastUpdate(): LocationUpdate | null {
    return this.lastUpdate;
  }

  /**
   * Update the filter configuration
   */
  updateConfig(config: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Create a new location filter instance
 */
export function createLocationFilter(config?: Partial<FilterConfig>): LocationFilter {
  return new LocationFilter(config);
}

/**
 * Validate a single location update without state
 */
export function validateLocationUpdate(
  update: LocationUpdate,
  config: Partial<FilterConfig> = {}
): { valid: boolean; reason?: string } {
  const filterConfig = { ...DEFAULT_FILTER_CONFIG, ...config };

  // Check accuracy
  if (update.accuracy < filterConfig.minAccuracy || update.accuracy > filterConfig.maxAccuracy) {
    return { valid: false, reason: 'Poor accuracy' };
  }

  // Check coordinates
  const { lat, lng } = update.coordinates;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || isNaN(lat) || isNaN(lng)) {
    return { valid: false, reason: 'Invalid coordinates' };
  }

  return { valid: true };
}
