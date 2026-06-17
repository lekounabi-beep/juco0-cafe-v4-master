import { useState, useEffect, useRef, useCallback } from 'react';

// Type declarations for Google Maps
declare global {
  interface Window {
    google?: any;
  }
}

export function useGoogleMaps(addressInputRef: React.RefObject<HTMLInputElement | null>, shouldInitialize: boolean = true, setAddress?: (address: string) => void) {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Load Google Maps using new bootstrap loader (no Loader class)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    console.log('Το API Key μου είναι:', apiKey);

    if (!apiKey) {
      setLoadError('Google Maps API Key is missing. Please check your environment variables.');
      console.error('Google Maps API Key is missing');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    // Load the bootstrap script (new API approach with loading=async)
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMaps&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;

    (window as any).initGoogleMaps = async () => {
      console.log('initGoogleMaps callback fired');
      try {
        // Wait for google to be available
        if (!window.google || !window.google.maps) {
          throw new Error('Google Maps object not available after script load');
        }

        // Wait for Google Maps core to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('Loading maps library...');
        await window.google.maps.importLibrary('maps');
        console.log('Maps library loaded');

        console.log('Loading places library...');
        await window.google.maps.importLibrary('places');
        console.log('Places library loaded');

        setGoogleMapsLoaded(true);
        console.log('Google Maps loaded successfully');
      } catch (error: any) {
        console.error('Failed to load Google Maps libraries:', error);
        console.error('Error details:', error.message, error.code);
        setLoadError(`Failed to load Google Maps: ${error.message || 'Unknown error'}`);
      }
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setLoadError('Failed to load Google Maps. Please check your internet connection and try again.');
    };

    script.onload = () => {
      console.log('Google Maps script loaded');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize Places Autocomplete with modern API when Google Maps is loaded and on delivery step
  useEffect(() => {
    if (googleMapsLoaded && shouldInitialize && addressInputRef?.current && window.google) {
      const input = addressInputRef.current;

      // Safety check: ensure input element exists in DOM
      if (!input) {
        console.error('Address input element not found in DOM');
        return;
      }
      
      // Create custom dropdown container
      const dropdown = document.createElement('div');
      dropdown.id = 'custom-autocomplete-dropdown';
      dropdown.className = 'custom-autocomplete-dropdown glass-strong';
      dropdown.style.cssText = `
        position: absolute;
        z-index: 9999 !important;
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
              // Use the modern Places API (New) with FieldMask header
              const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input: query,
                includedRegionCodes: ['GR'],
                language: 'el',
                sessionToken: sessionToken
              }, {
                headers: {
                  'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
                }
              });

              console.log("Places Response:", suggestions);

              if (suggestions && suggestions.length > 0) {
                dropdown.innerHTML = '';
                suggestions.forEach((suggestion: any) => {
                  console.log("Processing suggestion:", suggestion);

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

                  // Access text - handle both minified and standard property names
                  const addressText = suggestion.placePrediction?.text?.text ||
                                     suggestion.placePrediction?.text ||
                                     suggestion.text?.text ||
                                     suggestion.text ||
                                     suggestion.description ||
                                     suggestion.gD ||
                                     '';
                  item.textContent = addressText;
                  
                  item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(255, 255, 255, 0.1)';
                  });
                  
                  item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                  });

                  item.addEventListener('mousedown', async (e) => {
                    e.preventDefault(); // Prevent blur from closing dropdown

                    console.log("Επιλέχθηκε η διεύθυνση:", addressText);

                    // Get place details using the suggestion's placeId
                    try {
                      const placesLibrary = await window.google.maps.importLibrary("places");
                      const Place = placesLibrary.Place;

                      // Handle both minified and standard property names for placeId
                      const placeId = suggestion.placePrediction?.placeId ||
                                      suggestion.oh ||
                                      suggestion.id;

                      console.log("Using placeId:", placeId);

                      const place = await new Place({
                        id: placeId
                      }).fetchFields({
                        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
                      });

                      console.log("Place details fetched:", place);

                      const address = place.formattedAddress || place.displayName || '';

                      console.log("Setting address in input:", address);

                      // Call setAddress directly if provided (React state update)
                      if (setAddress && address) {
                        setAddress(address);
                      }

                      // Directly set input value as fallback
                      if (input && address) {
                        input.value = address;
                        // Trigger React change event
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                        nativeInputValueSetter?.call(input, address);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.dispatchEvent(new Event('blur', { bubbles: true }));
                      }

                      const event = new CustomEvent('addressSelected', {
                        detail: {
                          address: address,
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
  }, [googleMapsLoaded, shouldInitialize, addressInputRef]);

  // Initialize map when Google Maps is loaded and shouldInitialize is true
  useEffect(() => {
    if (googleMapsLoaded && !mapInstanceRef.current && shouldInitialize && mapRef.current) {
      console.log('Initializing map...');
      console.log('mapRef.current:', mapRef.current);
      console.log('document.getElementById("map"):', document.getElementById('map'));

      // Try to find the map div by id first (for CheckoutUI component)
      const mapElement = document.getElementById('map') || mapRef.current;

      if (!mapElement) {
        console.error('Map element not found!');
        return;
      }

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
          fullscreenControl: false
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
  }, [googleMapsLoaded, mapCenter, shouldInitialize, mapRef]);

  const panToLocation = useCallback((lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(16);
    }
  }, []);

  return {
    googleMapsLoaded,
    loadError,
    mapRef,
    mapCenter,
    setMapCenter,
    panToLocation,
  };
}
