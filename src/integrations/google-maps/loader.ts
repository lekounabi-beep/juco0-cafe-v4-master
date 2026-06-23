/**
 * Deterministic Google Maps script loader
 * 
 * ARCHITECTURE:
 * - Singleton pattern ensures single script load
 * - Promise-based API for deterministic awaiting
 * - No timing hacks or arbitrary delays
 * - Resolves only when API is fully ready
 */

import { googleMapsConfig } from './config';

declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}

export class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  async load(): Promise<void> {
    // Return immediately if already loaded
    if (this.loaded) {
      return Promise.resolve();
    }

    // Return existing promise if currently loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Validate API key
    if (!googleMapsConfig.apiKey) {
      console.error('[Loader] Google Maps API Key is missing');
      throw new Error('Google Maps API Key is missing');
    }

    // Check if already loaded in global scope
    if (window.google && window.google.maps) {
      console.log('[Loader] API already loaded in global scope');
      this.loaded = true;
      return Promise.resolve();
    }

    // Create loading promise
    this.loadingPromise = new Promise((resolve, reject) => {
      console.log('[Loader] Starting script load...');
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsConfig.apiKey}&callback=initGoogleMaps&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;

      window.initGoogleMaps = async () => {
        try {
          console.log('[Loader] Script callback fired');
          
          // Verify API is available
          if (!window.google || !window.google.maps) {
            throw new Error('Google Maps object not available after script load');
          }

          console.log('[Loader] Importing libraries...');
          
          // Import required libraries (deterministic, no timing hacks)
          await window.google.maps.importLibrary('maps');
          await window.google.maps.importLibrary('places');
          
          console.log('[Loader] Libraries imported successfully');
          
          this.loaded = true;
          resolve();
        } catch (error) {
          console.error('[Loader] Initialization failed:', error);
          reject(error);
        }
      };

      script.onerror = () => {
        console.error('[Loader] Script load failed');
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const googleMapsLoader = GoogleMapsLoader.getInstance();
