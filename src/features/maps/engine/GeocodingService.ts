/**
 * GeocodingService - Geocoding Logic
 * 
 * Handles all geocoding operations.
 * Triggered by map events, not React state.
 */

import type { Address, AddressComponents } from './types';

export class GeocodingService {
  private geocoder: google.maps.Geocoder | null;
  private isInitialized: boolean;

  constructor() {
    this.geocoder = null;
    this.isInitialized = false;
  }

  /**
   * Initialize geocoding service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!window.google?.maps) {
      throw new Error('Google Maps not loaded');
    }

    this.geocoder = new window.google.maps.Geocoder();
    this.isInitialized = true;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<Address> {
    if (!this.geocoder) {
      await this.initialize();
    }

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    const response = await this.geocoder.geocode({ location: { lat, lng } });

    if (!response.results || response.results.length === 0) {
      throw new Error('No results found for coordinates');
    }

    const result = response.results[0];
    const address = this.parseAddress(result);
    return address;
  }

  /**
   * Forward geocode address to coordinates
   */
  async forwardGeocode(address: string): Promise<google.maps.GeocoderResult[]> {
    if (!this.geocoder) {
      await this.initialize();
    }

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    const response = await this.geocoder.geocode({ address });

    if (!response.results || response.results.length === 0) {
      throw new Error('No results found for address');
    }

    return response.results;
  }

  /**
   * Parse address components from Google Maps result
   */
  private parseAddress(result: google.maps.GeocoderResult): Address {
    const components: AddressComponents = {
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
}
