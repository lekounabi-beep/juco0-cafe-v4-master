import { useState, useEffect, useRef, useCallback } from 'react';

// Type declarations for Google Maps
declare global {
  interface Window {
    initGoogleMaps?: () => void;
    google?: any;
  }
}

export function useGoogleMaps(addressInputRef: React.RefObject<HTMLInputElement | null>) {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Load Google Maps script with proper async loading
  useEffect(() => {
    // Set up the callback function
    window.initGoogleMaps = () => {
      setGoogleMapsLoaded(true);
    };

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    // Create and inject script tag with async and defer attributes
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,maps&callback=initGoogleMaps&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => console.error('Failed to load Google Maps script');
    
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove script if component unmounts (optional, usually not needed)
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize Places Autocomplete with modern API when Google Maps is loaded
  useEffect(() => {
    if (googleMapsLoaded && addressInputRef?.current && window.google) {
      const input = addressInputRef.current;
      
      // Create custom dropdown container
      const dropdown = document.createElement('div');
      dropdown.id = 'custom-autocomplete-dropdown';
      dropdown.className = 'custom-autocomplete-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        z-index: 9999 !important;
        background: rgba(30, 22, 17, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        max-height: 250px;
        overflow-y: auto;
        font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
        display: none;
        padding: 0.5rem;
      `;
      
      // Position dropdown below input
      const updateDropdownPosition = () => {
        const rect = input.getBoundingClientRect();
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        dropdown.style.width = `${rect.width}px`;
      };
      
      // Add dropdown to body
      document.body.appendChild(dropdown);
      
      // Import modern places library and initialize session token
      let sessionToken: any = null;
      let AutocompleteSuggestion: any = null;
      
      const initializePlacesLibrary = async () => {
        try {
          const placesLibrary = await window.google.maps.importLibrary("places");
          AutocompleteSuggestion = placesLibrary.AutocompleteSuggestion;
          const AutocompleteSessionToken = placesLibrary.AutocompleteSessionToken;
          sessionToken = new AutocompleteSessionToken();
        } catch (error) {
          console.error("Critical Google Maps API Error - Failed to import places library:", error);
        }
      };
      
      initializePlacesLibrary();
      
      // Debounce function for predictions
      let debounceTimer: NodeJS.Timeout;
      const fetchPredictions = async (query: string) => {
        if (!query || query.length < 2) {
          dropdown.style.display = 'none';
          return;
        }
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            if (!AutocompleteSuggestion || !sessionToken) {
              await initializePlacesLibrary();
            }
            
            if (AutocompleteSuggestion && sessionToken) {
              // Use the modern Places API (New)
              const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input: query,
                includedRegionCodes: ['GR'],
                language: 'el',
                sessionToken: sessionToken
              });
              
              if (suggestions && suggestions.length > 0) {
                dropdown.innerHTML = '';
                suggestions.forEach((suggestion: any) => {
                  const item = document.createElement('div');
                  item.className = 'autocomplete-item';
                  item.style.cssText = `
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    border-radius: 0.5rem;
                    color: #FFFFFF;
                    transition: all 0.2s ease;
                    font-size: 0.875rem;
                    font-weight: 500;
                  `;
                  
                  // Access text using new API property structure
                  const addressText = suggestion.placePrediction?.text?.text || suggestion.description || '';
                  item.textContent = addressText;
                  
                  item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(255, 255, 255, 0.1)';
                  });
                  
                  item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                  });
                  
                  item.addEventListener('click', async () => {
                    // Get place details using the suggestion's placeId
                    const placesLibrary = await window.google.maps.importLibrary("places");
                    const Place = placesLibrary.Place;
                    
                    try {
                      const place = await Place.fetchFields({
                        id: suggestion.placePrediction.placeId,
                        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
                      });
                      
                      const event = new CustomEvent('addressSelected', { 
                        detail: { 
                          address: place.formattedAddress || place.displayName,
                          coords: place.location ? {
                            lat: place.location.lat(),
                            lng: place.location.lng(),
                          } : null
                        }
                      });
                      window.dispatchEvent(event);
                      
                      if (place.location) {
                        const newCoords = {
                          lat: place.location.lat(),
                          lng: place.location.lng(),
                        };
                        setMapCenter(newCoords);
                        
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.panTo(place.location);
                          mapInstanceRef.current.setZoom(16);
                        }
                      }
                    } catch (error) {
                      console.error("Error fetching place details:", error);
                    }
                    
                    dropdown.style.display = 'none';
                  });
                  
                  dropdown.appendChild(item);
                });
                dropdown.style.display = 'block';
                updateDropdownPosition();
              } else {
                dropdown.style.display = 'none';
              }
            }
          } catch (error) {
            console.error("Critical Google Maps API Error:", error);
            dropdown.style.display = 'none';
          }
        }, 300);
      };
      
      // Handle input changes
      input.addEventListener('input', (e) => {
        fetchPredictions((e.target as HTMLInputElement).value);
      });
      
      // Handle focus
      input.addEventListener('focus', () => {
        if (input.value) {
          fetchPredictions(input.value);
        }
      });
      
      // Handle blur (delay to allow click on dropdown)
      input.addEventListener('blur', () => {
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 200);
      });
      
      // Handle scroll to update position
      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);
      
      return () => {
        document.body.removeChild(dropdown);
        window.removeEventListener('scroll', updateDropdownPosition);
        window.removeEventListener('resize', updateDropdownPosition);
        clearTimeout(debounceTimer);
      };
    }
  }, [googleMapsLoaded, addressInputRef]);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (googleMapsLoaded && !mapInstanceRef.current) {
      // Try to find the map div by id first (for CheckoutUI component)
      const mapElement = document.getElementById('map') || mapRef.current;
      
      if (!mapElement) return;

      // Default to Nafpaktos center for windsurf area
      const defaultCenter = { lat: 38.3930, lng: 21.8280 };
      const initialCenter = mapCenter || defaultCenter;
      
      const map = new window.google.maps.Map(mapElement, {
        center: initialCenter,
        zoom: 13,
        gestureHandling: 'cooperative',
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#e5e5e5' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'administrative',
            elementType: 'geometry',
            stylers: [{ color: '#2d1f14' }]
          },
          {
            featureType: 'administrative.country',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f97316' }]
          },
          {
            featureType: 'administrative.land_parcel',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f97316' }]
          },
          {
            featureType: 'administrative.neighborhood',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'landscape.man_made',
            elementType: 'geometry',
            stylers: [{ color: '#2d1f14' }]
          },
          {
            featureType: 'landscape.man_made.building',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'landscape.natural',
            elementType: 'geometry',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{ color: '#2d1f14' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d4d4d4' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'poi.business',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'poi.medical',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'poi.government',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b7280' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#2d1f14' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f97316' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#3d2a1a' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f97316' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'road.arterial',
            elementType: 'geometry',
            stylers: [{ color: '#2d1f14' }]
          },
          {
            featureType: 'road.arterial',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f97316' }]
          },
          {
            featureType: 'road.local',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d4d4d4' }]
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2d1f14' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d4d4d4' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#1E1611' }]
          },
          {
            featureType: 'transit.line',
            elementType: 'geometry',
            stylers: [{ color: '#f97316' }]
          },
          {
            featureType: 'transit.station',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#0a4d68' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b7280' }]
          }
        ]
      });
      
      mapInstanceRef.current = map;
      setMapCenter(initialCenter);
      
      // Add drag event listener for reverse geocoding
      let geocodeTimeout: NodeJS.Timeout;
      
      map.addListener('dragend', () => {
        const center = map.getCenter();
        const newCoords = { lat: center.lat(), lng: center.lng() };
        setMapCenter(newCoords);
        
        // Dispatch event for parent component to handle
        const event = new CustomEvent('mapMoved', { detail: { coords: newCoords } });
        window.dispatchEvent(event);
        
        // Debounced reverse geocoding
        clearTimeout(geocodeTimeout);
        geocodeTimeout = setTimeout(async () => {
          if (window.google && window.google.maps) {
            try {
              const geocoder = new window.google.maps.Geocoder();
              const response = await geocoder.geocode({ location: newCoords });
              
              if (response.results && response.results[0]) {
                const addressEvent = new CustomEvent('addressFromMap', { 
                  detail: { address: response.results[0].formatted_address }
                });
                window.dispatchEvent(addressEvent);
              }
            } catch (error) {
              console.error('Reverse geocoding error:', error);
            }
          }
        }, 300);
      });
    }
  }, [googleMapsLoaded, mapCenter]);

  const panToLocation = useCallback((lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(16);
    }
  }, []);

  return {
    googleMapsLoaded,
    mapRef,
    mapCenter,
    setMapCenter,
    panToLocation,
  };
}
