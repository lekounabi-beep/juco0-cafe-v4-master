/**
 * Google Maps API service functions
 */

import type { Coordinates } from '@/shared/types/common.types';

export interface AutocompleteSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
}

export interface PlaceDetails {
  formattedAddress: string;
  location: Coordinates;
  addressComponents?: any[];
}

export async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  if (!window.google || !window.google.maps) {
    console.error('Google Maps not loaded');
    return null;
  }

  try {
    const geocoder = new window.google.maps.Geocoder();
    const response = await geocoder.geocode({ location: coords });
    
    if (response.results && response.results[0]) {
      return response.results[0].formatted_address;
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!window.google || !window.google.maps) {
    console.error('Google Maps not loaded');
    return null;
  }

  try {
    const placesLibrary = await window.google.maps.importLibrary('places');
    const Place = placesLibrary.Place;

    const place = await new Place({ id: placeId }).fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
    });

    // The new API returns location in place.place.location
    const actualPlace = place.place || place;

    if (!actualPlace.location) {
      console.error('Place location is null');
      return null;
    }

    return {
      formattedAddress: actualPlace.formattedAddress || actualPlace.displayName || '',
      location: {
        lat: actualPlace.location.lat(),
        lng: actualPlace.location.lng(),
      },
      addressComponents: actualPlace.addressComponents,
    };
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

export async function autocompleteAddress(
  query: string,
  sessionToken: any
): Promise<AutocompleteSuggestion[]> {
  if (!window.google || !window.google.maps) {
    console.error('Google Maps not loaded');
    return [];
  }

  try {
    const placesLibrary = await window.google.maps.importLibrary('places');
    const AutocompleteSuggestion = placesLibrary.AutocompleteSuggestion;

    const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query,
      includedRegionCodes: ['GR'],
      language: 'el',
      sessionToken: sessionToken
    }, {
      headers: {
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
      }
    });

    if (!response || !response.suggestions || response.suggestions.length === 0) {
      return [];
    }

    const mappedSuggestions = response.suggestions.map((suggestion: any) => {
      const placePrediction = suggestion.placePrediction;
      if (!placePrediction) {
        return null;
      }

      return {
        placeId: placePrediction.placeId,
        description: placePrediction.text?.text || placePrediction.text || '',
        mainText: placePrediction.text?.text?.split(',')[0] || '',
        secondaryText: placePrediction.text?.text?.split(',').slice(1).join(',').trim() || '',
      };
    }).filter(Boolean);

    return mappedSuggestions;
  } catch (error) {
    console.error('Autocomplete error:', error);
    return [];
  }
}
