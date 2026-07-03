/**
 * Speed Service
 * Calculate and track average speed for ETA calculations
 */

import type { Coordinates } from "@/shared/types/common.types";
import { calculateDistance } from "./distance.service";

export interface SpeedSample {
  speed: number; // m/s
  timestamp: number;
  coordinates: Coordinates;
}

export interface SpeedStats {
  averageSpeed: number; // m/s
  currentSpeed: number; // m/s
  maxSpeed: number; // m/s
  sampleCount: number;
}

/**
 * Speed tracker for calculating average moving speed
 */
export class SpeedTracker {
  private samples: SpeedSample[] = [];
  private maxSamples = 30; // Keep last 30 samples
  private minSpeedThreshold = 1.0; // 1 m/s (~3.6 km/h) - below this is considered stopped
  private maxSpeedThreshold = 50.0; // 50 m/s (~180 km/h) - above this is considered invalid

  /**
   * Add a speed sample
   */
  addSample(speed: number, coordinates: Coordinates): void {
    // Filter out invalid speeds
    if (speed < 0 || speed > this.maxSpeedThreshold) {
      return;
    }

    const sample: SpeedSample = {
      speed,
      timestamp: Date.now(),
      coordinates,
    };

    this.samples.push(sample);

    // Keep only the most recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Calculate average moving speed (excluding stopped periods)
   */
  getAverageMovingSpeed(): number {
    if (this.samples.length === 0) {
      return 0;
    }

    // Filter out samples below threshold (stopped)
    const movingSamples = this.samples.filter((sample) => sample.speed >= this.minSpeedThreshold);

    if (movingSamples.length === 0) {
      return 0;
    }

    const totalSpeed = movingSamples.reduce((sum, sample) => sum + sample.speed, 0);
    return totalSpeed / movingSamples.length;
  }

  /**
   * Get current speed (most recent sample)
   */
  getCurrentSpeed(): number {
    if (this.samples.length === 0) {
      return 0;
    }
    return this.samples[this.samples.length - 1].speed;
  }

  /**
   * Get max speed from samples
   */
  getMaxSpeed(): number {
    if (this.samples.length === 0) {
      return 0;
    }
    return Math.max(...this.samples.map((sample) => sample.speed));
  }

  /**
   * Get comprehensive speed statistics
   */
  getStats(): SpeedStats {
    return {
      averageSpeed: this.getAverageMovingSpeed(),
      currentSpeed: this.getCurrentSpeed(),
      maxSpeed: this.getMaxSpeed(),
      sampleCount: this.samples.length,
    };
  }

  /**
   * Clear all samples
   */
  clear(): void {
    this.samples = [];
  }

  /**
   * Get sample count
   */
  getSampleCount(): number {
    return this.samples.length;
  }
}

/**
 * Calculate speed between two coordinates with time difference
 */
export function calculateSpeed(from: Coordinates, to: Coordinates, timeDiffMs: number): number {
  if (timeDiffMs <= 0) {
    return 0;
  }

  const distance = calculateDistance(from, to);
  const timeDiffSeconds = timeDiffMs / 1000;

  return distance / timeDiffSeconds;
}

/**
 * Convert speed from m/s to km/h
 */
export function speedToKmh(speedMs: number): number {
  return speedMs * 3.6;
}

/**
 * Convert speed from km/h to m/s
 */
export function speedFromKmh(speedKmh: number): number {
  return speedKmh / 3.6;
}

/**
 * Create a new speed tracker instance
 */
export function createSpeedTracker(): SpeedTracker {
  return new SpeedTracker();
}
