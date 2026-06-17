/**
 * Google Maps script loader
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
      console.error('Google Maps API Key is missing');
      throw new Error('Google Maps API Key is missing');
    }

    // Check if already loaded
    if (window.google && window.google.maps) {
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
          if (!window.google || !window.google.maps) {
            throw new Error('Google Maps object not available after script load');
          }

          await new Promise(resolve => setTimeout(resolve, 100));

          await window.google.maps.importLibrary('maps');
          await window.google.maps.importLibrary('places');

          this.loaded = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      script.onerror = () => {
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
