/**
 * MapInstance - Wrapper for google.maps.Map
 * 
 * Provides type-safe wrappers around google.maps.Map API.
 * This is a thin wrapper to ensure type safety and logging.
 */

import type { LatLng } from './types';

export class MapInstance {
  private map: google.maps.Map;

  constructor(map: google.maps.Map) {
    this.map = map;
  }

  /**
   * Get native map instance (internal use only)
   */
  getNativeMap(): google.maps.Map {
    return this.map;
  }

  /**
   * Set map center
   */
  setCenter(lat: number, lng: number): void {
    this.map.setCenter({ lat, lng });
  }

  /**
   * Get map center
   */
  getCenter(): LatLng | null {
    const center = this.map.getCenter();
    if (!center) return null;
    return { lat: center.lat(), lng: center.lng() };
  }

  /**
   * Set map zoom
   */
  setZoom(zoom: number): void {
    this.map.setZoom(zoom);
  }

  /**
   * Get map zoom
   */
  getZoom(): number | null {
    return this.map.getZoom() || null;
  }

  /**
   * Trigger a Google Maps event
   */
  trigger(event: string): void {
    window.google.maps.event.trigger(this.map, event);
  }

  /**
   * Pan to location
   */
  panTo(lat: number, lng: number): void {
    this.map.panTo({ lat, lng });
  }

  /**
   * Fit bounds
   */
  fitBounds(bounds: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral): void {
    this.map.fitBounds(bounds);
  }

  /**
   * Get bounds
   */
  getBounds(): google.maps.LatLngBounds | null {
    return this.map.getBounds() || null;
  }
}
