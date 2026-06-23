/**
 * MarkerManager - Marker Subsystem
 * 
 * Manages all markers on the map.
 * Markers are imperative only - no React state involved.
 */

import type { MarkerOptions } from './types';

export class MarkerManager {
  private markers: Map<string, google.maps.Marker>;
  private map: google.maps.Map | null;

  constructor() {
    this.markers = new Map();
    this.map = null;
  }

  /**
   * Attach map to marker manager
   * This must be called before any marker operations
   */
  attachMap(map: google.maps.Map): void {
    this.map = map;
    console.log('[MarkerManager] Map attached');
  }

  /**
   * Detach map from marker manager
   */
  detachMap(): void {
    this.map = null;
    console.log('[MarkerManager] Map detached');
  }

  /**
   * Set or update a marker
   * If marker exists, updates its position
   * If marker doesn't exist, creates new marker
   */
  setMarker(
    id: string,
    lat: number,
    lng: number,
    options: MarkerOptions = {}
  ): void {
    if (!this.map) {
      console.warn('[MarkerManager] Cannot set marker - map not attached');
      return;
    }

    const existingMarker = this.markers.get(id);

    if (existingMarker) {
      // Update existing marker position
      existingMarker.setPosition({ lat, lng });
      console.log('[MarkerManager] Updated marker position:', { id, lat, lng });
    } else {
      // Create new marker
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        draggable: options.draggable || false,
        animation: options.animation,
        icon: options.icon,
      });

      this.markers.set(id, marker);
      console.log('[MarkerManager] Created marker:', { id, lat, lng });
    }
  }

  /**
   * Remove a specific marker
   */
  removeMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker) {
      marker.setMap(null);
      this.markers.delete(id);
      console.log('[MarkerManager] Removed marker:', { id });
    }
  }

  /**
   * Get a specific marker
   */
  getMarker(id: string): google.maps.Marker | null {
    return this.markers.get(id) || null;
  }

  /**
   * Clear all markers
   */
  clearAll(): void {
    this.markers.forEach((marker) => {
      marker.setMap(null);
    });
    this.markers.clear();
    console.log('[MarkerManager] Cleared all markers');
  }

  /**
   * Get all marker IDs
   */
  getMarkerIds(): string[] {
    return Array.from(this.markers.keys());
  }

  /**
   * Get marker count
   */
  getMarkerCount(): number {
    return this.markers.size;
  }
}
