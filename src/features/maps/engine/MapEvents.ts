/**
 * MapEvents - Internal Event Bus System
 * 
 * Provides a clean, type-safe event system for MapEngine.
 * All map events flow through this bus, eliminating React coupling.
 */

import type { EventHandler, Unsubscribe, LatLng, Address } from './types';

export interface MapEventTypes {
  // Lifecycle events
  MAP_READY: void;
  MAP_DESTROYED: void;
  
  // Map interaction events
  DRAG_START: void;
  DRAG_END: LatLng;
  CENTER_CHANGED: LatLng;
  ZOOM_CHANGED: number;
  IDLE: void;
  TILES_LOADED: void;
  BOUNDS_CHANGED: google.maps.LatLngBounds;
  
  // Geocoding events
  ADDRESS_CHANGED: Address;
  
  // Marker events
  MARKER_CHANGED: { id: string; lat: number; lng: number };
}

export class MapEvents {
  private listeners: Map<keyof MapEventTypes, Set<EventHandler>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * Returns unsubscribe function
   */
  on<K extends keyof MapEventTypes>(
    event: K,
    handler: EventHandler<MapEventTypes[K]>
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const eventListeners = this.listeners.get(event)!;
    eventListeners.add(handler);

    // Return unsubscribe function
    return () => {
      eventListeners.delete(handler);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   */
  once<K extends keyof MapEventTypes>(
    event: K,
    handler: EventHandler<MapEventTypes[K]>
  ): Unsubscribe {
    const wrappedHandler: EventHandler<MapEventTypes[K]> = (data) => {
      handler(data);
      unsubscribe();
    };

    const unsubscribe = this.on(event, wrappedHandler);
    return unsubscribe;
  }

  /**
   * Emit an event to all subscribers
   */
  emit<K extends keyof MapEventTypes>(event: K, data: MapEventTypes[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[MapEvents] Error in handler for event ${String(event)}:`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners for a specific event or all events
   */
  clear(event?: keyof MapEventTypes): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event (for debugging)
   */
  getListenerCount(event: keyof MapEventTypes): number {
    return this.listeners.get(event)?.size || 0;
  }
}
