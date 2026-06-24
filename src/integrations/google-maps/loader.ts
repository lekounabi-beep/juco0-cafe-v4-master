/**
 * Deterministic Google Maps script loader
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
    if (this.loaded) {
      return Promise.resolve();
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    if (!googleMapsConfig.apiKey) {
      throw new Error('Google Maps API Key is missing (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)');
    }

    if (window.google?.maps) {
      this.loaded = true;
      return Promise.resolve();
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsConfig.apiKey}&callback=initGoogleMaps&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;

      window.initGoogleMaps = async () => {
        try {
          if (!window.google?.maps) {
            throw new Error('Google Maps object not available after script load');
          }

          await window.google.maps.importLibrary('maps');
          await window.google.maps.importLibrary('places');

          this.loaded = true;
          resolve();
        } catch (error) {
          this.loadingPromise = null;
          reject(error);
        }
      };

      script.onerror = () => {
        this.loadingPromise = null;
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
