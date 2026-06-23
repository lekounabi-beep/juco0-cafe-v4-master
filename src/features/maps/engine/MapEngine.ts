/**
 * MapEngine - Core Engine (Singleton)
 * 
 * RESPONSIBILITIES:
 * - Owns google.maps.Map instance (single source of truth)
 * - Creates map ONLY ONCE per app lifetime
 * - Exposes imperative API only
 * - Controls event emission via MapEvents
 * - NEVER depends on React lifecycle
 * 
 * RULES:
 * - Singleton pattern enforced
 * - No React dependencies
 * - No marker logic (handled by MarkerManager)
 * - No geocoding logic (handled by GeocodingService)
 */

import { googleMapsLoader } from '@/integrations/google-maps/loader';
import { googleMapsConfig } from '@/integrations/google-maps/config';
import { MapEvents, MapEventTypes } from './MapEvents';
import type { EventHandler, Unsubscribe, LatLng } from './types';
import { WOLT_DARK_THEME } from '../components/MapTheme';

export class MapEngine {
  private static instance: MapEngine | null = null;
  private map: google.maps.Map | null = null;
  private events: MapEvents;
  private isInitialized: boolean = false;
  private container: HTMLElement | null = null;

  private constructor() {
    this.events = new MapEvents();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MapEngine {
    if (!MapEngine.instance) {
      MapEngine.instance = new MapEngine();
    }
    return MapEngine.instance;
  }

  /**
   * Attach map to container
   * This is the ONLY entry point for map creation
   */
  async attach(container: HTMLElement): Promise<void> {
    if (this.isInitialized && this.map) {
      console.log('[MapEngine] Already initialized, returning existing map');
      return;
    }

    console.log('[MapEngine] Initializing map...');
    this.container = container;

    try {
      // Load Google Maps API
      await googleMapsLoader.load();

      if (!window.google?.maps?.importLibrary) {
        throw new Error('Google Maps importLibrary not available');
      }

      await window.google.maps.importLibrary('maps');
      console.log('[MapEngine] Google Maps API loaded');

      // Wait for container to have dimensions
      await this.waitForContainerReady(container);

      // Create map instance with Wolt-inspired dark theme
      this.map = new window.google.maps.Map(container, {
        center: googleMapsConfig.defaultCenter,
        zoom: googleMapsConfig.defaultZoom,
        gestureHandling: 'cooperative',
        disableDefaultUI: true,
        styles: WOLT_DARK_THEME,
        clickableIcons: false,
      });

      console.log('[MapEngine] Map instance created with Wolt dark theme');

      // Wait for map to be ready (tilesloaded + idle)
      await this.waitForMapReady();

      this.isInitialized = true;
      this.events.emit('MAP_READY', undefined);

      // Bind Google Maps events to MapEngine events
      this.bindMapEvents();

      console.log('[MapEngine] Map is ready');
    } catch (error) {
      console.error('[MapEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Detach and destroy map
   * Only called on app exit or explicit teardown
   */
  detach(): void {
    if (this.map) {
      window.google.maps.event.clearInstanceListeners(this.map);
      this.map = null;
    }
    this.isInitialized = false;
    this.container = null;
    this.events.emit('MAP_DESTROYED', undefined);
    console.log('[MapEngine] Map detached and destroyed');
  }

  /**
   * Get native map instance (internal use only)
   */
  getMap(): google.maps.Map | null {
    return this.map;
  }

  /**
   * Check if map is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.map !== null;
  }

  /**
   * Subscribe to events
   */
  on<K extends keyof MapEventTypes>(
    event: K,
    handler: EventHandler<MapEventTypes[K]>
  ): Unsubscribe {
    return this.events.on(event, handler);
  }

  /**
   * Subscribe to event once
   */
  once<K extends keyof MapEventTypes>(
    event: K,
    handler: EventHandler<MapEventTypes[K]>
  ): Unsubscribe {
    return this.events.once(event, handler);
  }

  /**
   * Set map center
   */
  setCenter(lat: number, lng: number): void {
    if (!this.map) {
      console.warn('[MapEngine] Cannot set center - map not ready');
      return;
    }
    this.map.setCenter({ lat, lng });
  }

  /**
   * Get map center
   */
  getCenter(): LatLng | null {
    if (!this.map) return null;
    const center = this.map.getCenter();
    if (!center) return null;
    return { lat: center.lat(), lng: center.lng() };
  }

  /**
   * Set map zoom
   */
  setZoom(zoom: number): void {
    if (!this.map) {
      console.warn('[MapEngine] Cannot set zoom - map not ready');
      return;
    }
    this.map.setZoom(zoom);
  }

  /**
   * Get map zoom
   */
  getZoom(): number | null {
    if (!this.map) return null;
    return this.map.getZoom() || null;
  }

  /**
   * Wait for container to have valid dimensions
   */
  private async waitForContainerReady(container: HTMLElement): Promise<void> {
    const checkDimensions = (): Promise<void> => {
      return new Promise((resolve) => {
        const check = () => {
          const rect = container.getBoundingClientRect();
          const MIN_DIMENSION = 100;
          if (rect.width >= MIN_DIMENSION && rect.height >= MIN_DIMENSION) {
            console.log('[MapEngine] Container ready:', { width: rect.width, height: rect.height });
            resolve();
          } else {
            console.log('[MapEngine] Container not ready, retrying...', { width: rect.width, height: rect.height });
            setTimeout(check, 100);
          }
        };
        check();
      });
    };

    await checkDimensions();
  }

  /**
   * Bind Google Maps events to MapEngine events
   */
  private bindMapEvents(): void {
    if (!this.map) return;

    // Bind dragstart
    this.map.addListener('dragstart', () => {
      this.events.emit('DRAG_START', undefined);
    });

    // Bind dragend and trigger geocoding
    this.map.addListener('dragend', () => {
      const center = this.map!.getCenter();
      if (!center) return;

      const coords = { lat: center.lat(), lng: center.lng() };
      this.events.emit('DRAG_END', coords);

      // Trigger geocoding
      this.triggerGeocoding(coords.lat, coords.lng);
    });

    // Bind center_changed
    this.map.addListener('center_changed', () => {
      const center = this.map!.getCenter();
      if (!center) return;

      const coords = { lat: center.lat(), lng: center.lng() };
      this.events.emit('CENTER_CHANGED', coords);
    });

    // Bind zoom_changed
    this.map.addListener('zoom_changed', () => {
      const zoom = this.map!.getZoom();
      if (zoom !== undefined) {
        this.events.emit('ZOOM_CHANGED', zoom);
      }
    });

    console.log('[MapEngine] Google Maps events bound');
  }

  /**
   * Trigger geocoding for coordinates
   */
  private async triggerGeocoding(lat: number, lng: number): Promise<void> {
    try {
      if (!window.google?.maps) {
        console.error('[MapEngine] Google Maps not available for geocoding');
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });

      if (response.results && response.results[0]) {
        const result = response.results[0];
        const address = this.parseAddress(result);
        this.events.emit('ADDRESS_CHANGED', address);
      }
    } catch (error) {
      console.error('[MapEngine] Geocoding failed:', error);
    }
  }

  /**
   * Parse address from Google Maps result
   */
  private parseAddress(result: google.maps.GeocoderResult): import('./types').Address {
    const components = {
      street: '',
      number: '',
      area: '',
      postalCode: '',
    };

    result.address_components.forEach((component) => {
      const types = component.types;

      if (types.includes('street_number')) {
        components.number = component.long_name;
      } else if (types.includes('route')) {
        components.street = component.long_name;
      } else if (types.includes('locality') || types.includes('sublocality')) {
        components.area = component.long_name;
      } else if (types.includes('postal_code')) {
        components.postalCode = component.long_name;
      }
    });

    return {
      formatted: result.formatted_address,
      components,
    };
  }

  /**
   * Wait for map to be ready (tilesloaded + idle)
   */
  private async waitForMapReady(): Promise<void> {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    return new Promise((resolve) => {
      // Wait for tilesloaded
      window.google.maps.event.addListenerOnce(this.map!, 'tilesloaded', () => {
        console.log('[MapEngine] Tiles loaded');
        this.events.emit('TILES_LOADED', undefined);

        // Wait for idle after tilesloaded
        window.google.maps.event.addListenerOnce(this.map!, 'idle', () => {
          console.log('[MapEngine] Map idle');
          this.events.emit('IDLE', undefined);
          resolve();
        });
      });
    });
  }
}

// Export singleton instance
export const mapEngine = MapEngine.getInstance();
