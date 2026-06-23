/**
 * ETA Service
 * Calculate estimated time of arrival based on distance and average speed
 */

import type { Coordinates } from '@/shared/types/common.types';
import { calculateDistance } from './distance.service';
import { speedFromKmh, speedToKmh } from './speed.service';

export interface ETAConfig {
  arrivalThreshold: number; // Distance threshold for arrival detection in meters (default: 50m)
  minSpeedForCalculation: number; // Minimum speed for ETA calculation in km/h (default: 5 km/h)
  maxSpeedForCalculation: number; // Maximum speed for ETA calculation in km/h (default: 80 km/h)
  smoothingFactor: number; // ETA smoothing factor (default: 0.3)
}

export const DEFAULT_ETA_CONFIG: ETAConfig = {
  arrivalThreshold: 50, // 50 meters
  minSpeedForCalculation: 5, // 5 km/h
  maxSpeedForCalculation: 80, // 80 km/h
  smoothingFactor: 0.3,
};

export interface ETAResult {
  eta: Date | null;
  remainingDistance: number; // meters
  remainingTime: number; // seconds
  averageSpeed: number; // m/s
  isArrived: boolean;
}

/**
 * ETA calculator for delivery tracking
 */
export class ETACalculator {
  private config: ETAConfig;
  private smoothedETA: Date | null = null;

  constructor(config: Partial<ETAConfig> = {}) {
    this.config = { ...DEFAULT_ETA_CONFIG, ...config };
  }

  /**
   * Calculate ETA based on current location, destination, and average speed
   */
  calculateETA(
    currentLocation: Coordinates,
    destination: Coordinates,
    averageSpeedMs: number
  ): ETAResult {
    const remainingDistance = calculateDistance(currentLocation, destination);

    // Check if arrived
    if (remainingDistance <= this.config.arrivalThreshold) {
      return {
        eta: new Date(),
        remainingDistance,
        remainingTime: 0,
        averageSpeed: averageSpeedMs,
        isArrived: true,
      };
    }

    // Filter out invalid speeds
    const speedKmh = speedToKmh(averageSpeedMs);
    if (speedKmh < this.config.minSpeedForCalculation || speedKmh > this.config.maxSpeedForCalculation) {
      return {
        eta: null,
        remainingDistance,
        remainingTime: 0,
        averageSpeed: averageSpeedMs,
        isArrived: false,
      };
    }

    // Calculate remaining time in seconds
    const remainingTime = remainingDistance / averageSpeedMs;

    // Calculate ETA
    const now = new Date();
    const eta = new Date(now.getTime() + remainingTime * 1000);

    // Apply smoothing
    if (this.smoothedETA) {
      const smoothedTime = this.smoothedETA.getTime();
      const newTime = eta.getTime();
      const smoothedTimestamp = smoothedTime + this.config.smoothingFactor * (newTime - smoothedTime);
      this.smoothedETA = new Date(smoothedTimestamp);
    } else {
      this.smoothedETA = eta;
    }

    return {
      eta: this.smoothedETA,
      remainingDistance,
      remainingTime,
      averageSpeed: averageSpeedMs,
      isArrived: false,
    };
  }

  /**
   * Check if driver has arrived at destination
   */
  isArrived(currentLocation: Coordinates, destination: Coordinates): boolean {
    const distance = calculateDistance(currentLocation, destination);
    return distance <= this.config.arrivalThreshold;
  }

  /**
   * Reset smoothing state
   */
  reset(): void {
    this.smoothedETA = null;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ETAConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Calculate ETA without state (pure function)
 */
export function calculateETAStatic(
  currentLocation: Coordinates,
  destination: Coordinates,
  averageSpeedMs: number,
  config: Partial<ETAConfig> = {}
): ETAResult {
  const calculator = new ETACalculator(config);
  return calculator.calculateETA(currentLocation, destination, averageSpeedMs);
}

/**
 * Check if arrived without state (pure function)
 */
export function isArrivedStatic(
  currentLocation: Coordinates,
  destination: Coordinates,
  config: Partial<ETAConfig> = {}
): boolean {
  const calculator = new ETACalculator(config);
  return calculator.isArrived(currentLocation, destination);
}

/**
 * Create a new ETA calculator instance
 */
export function createETACalculator(config?: Partial<ETAConfig>): ETACalculator {
  return new ETACalculator(config);
}

/**
 * Format ETA as human-readable string
 */
export function formatETA(eta: Date | null): string {
  if (!eta) {
    return 'Calculating...';
  }

  const now = new Date();
  const diffMs = eta.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes <= 0) {
    return 'Arriving now';
  }

  if (diffMinutes < 1) {
    return 'Less than 1 min';
  }

  if (diffMinutes === 1) {
    return '1 min';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours === 1) {
    return minutes > 0 ? `1 hr ${minutes} min` : '1 hr';
  }

  return minutes > 0 ? `${hours} hrs ${minutes} min` : `${hours} hrs`;
}

/**
 * Format distance as human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}
