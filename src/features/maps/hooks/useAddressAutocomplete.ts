/**
 * Address Autocomplete hook - handles Google Places autocomplete
 */

import { useEffect, useRef } from 'react';
import { autocompleteAddress, getPlaceDetails } from '@/integrations/google-maps/services/googleMaps.service';
import { useMapsStore } from '../store/maps-store';

export function useAddressAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  shouldInitialize: boolean = true,
  onAddressSelect?: (address: string, coords: { lat: number; lng: number }) => void
) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const { selectedAddress, setSelectedAddress, setSelectedCoords } = useMapsStore();

  // Initialize session token
  useEffect(() => {
    if (!shouldInitialize) {
      return;
    }

    if (!window.google || !window.google.maps) {
      const retryTimer = setTimeout(() => {
        if (window.google && window.google.maps) {
          window.google.maps.importLibrary('places').then((placesLibrary: any) => {
            const AutocompleteSessionToken = placesLibrary.AutocompleteSessionToken;
            sessionTokenRef.current = new AutocompleteSessionToken();
          }).catch((error: Error) => {
            console.error('Failed to initialize session token on retry:', error);
          });
        }
      }, 500);
      return () => clearTimeout(retryTimer);
    }

    window.google.maps.importLibrary('places').then((placesLibrary: any) => {
      const AutocompleteSessionToken = placesLibrary.AutocompleteSessionToken;
      sessionTokenRef.current = new AutocompleteSessionToken();
    }).catch((error: Error) => {
      console.error('Failed to initialize session token:', error);
    });
  }, [shouldInitialize]);

  // Handle autocomplete
  useEffect(() => {
    // Prevent duplicate initialization
    if (isInitializedRef.current) {
      return;
    }
    
    if (!shouldInitialize || !inputRef?.current) {
      return;
    }

    const initializeAutocomplete = () => {
      isInitializedRef.current = true;

      // Initialize session token immediately if not already done
      if (!sessionTokenRef.current) {
        window.google.maps.importLibrary('places').then((placesLibrary: any) => {
          const AutocompleteSessionToken = placesLibrary.AutocompleteSessionToken;
          sessionTokenRef.current = new AutocompleteSessionToken();
        }).catch((error: Error) => {
          console.error('Failed to initialize session token:', error);
        });
      }

      const input = inputRef.current!;
      let debounceTimer: NodeJS.Timeout;
      let lastValue = input.value;
      let isDropdownVisible = false;

      // Create dropdown with glassmorphism styling
      const dropdown = document.createElement('div');
      dropdown.id = 'custom-autocomplete-dropdown';
      dropdown.className = 'glass-strong';
      dropdown.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        border-radius: 12px !important;
        max-height: 250px !important;
        overflow-y: auto !important;
        font-family: 'Inter', ui-sans-serif, system-ui, sans-serif !important;
        display: none !important;
        padding: 0.5rem !important;
        background: rgba(0, 0, 0, 0.6) !important;
        backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        pointer-events: auto !important;
        color: #FFFFFF !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        visibility: visible !important;
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
      `;

      const updateDropdownPosition = () => {
        const rect = input.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.top = `${rect.bottom}px`;
        dropdown.style.width = `${rect.width}px`;
      };

      // Always append to body to avoid any overflow/positioning issues
      document.body.appendChild(dropdown);

      const fetchPredictions = async (query: string) => {
        if (!query || query.length < 2) {
          dropdown.style.display = 'none';
          return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const suggestions = await autocompleteAddress(query, sessionTokenRef.current);

            if (suggestions.length > 0) {
              dropdown.innerHTML = '';
              suggestions.forEach((suggestion) => {
                const item = document.createElement('div');
                item.style.cssText = `
                  padding: 0.75rem 1rem;
                  cursor: pointer;
                  border-radius: 8px;
                  color: rgba(255, 255, 255, 0.9);
                  font-size: 0.875rem;
                  font-weight: 500;
                  transition: background 0.15s ease;
                `;
                item.textContent = suggestion.description;

                item.addEventListener('mouseenter', () => {
                  item.style.background = 'rgba(255, 255, 255, 0.15)';
                });

                item.addEventListener('mouseleave', () => {
                  item.style.background = 'transparent';
                });

                item.addEventListener('mousedown', async (e) => {
                  e.preventDefault();

                  const placeDetails = await getPlaceDetails(suggestion.placeId);
                  
                  if (placeDetails) {
                    setSelectedAddress(placeDetails.formattedAddress);
                    setSelectedCoords(placeDetails.location);
                    
                    if (onAddressSelect) {
                      onAddressSelect(placeDetails.formattedAddress, placeDetails.location);
                    }

                    // Also update the input directly for immediate feedback
                    input.value = placeDetails.formattedAddress;
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                    nativeInputValueSetter?.call(input, placeDetails.formattedAddress);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                  }

                  dropdown.style.display = 'none';
                  isDropdownVisible = false;
                });

                dropdown.appendChild(item);
              });
              dropdown.style.display = 'block';
              isDropdownVisible = true;
              // Use requestAnimationFrame to ensure browser has rendered before positioning
              requestAnimationFrame(() => {
                updateDropdownPosition();
              });
            } else {
              dropdown.style.display = 'none';
            }
          } catch (error) {
            console.error('Autocomplete error:', error);
            dropdown.style.display = 'none';
          }
        }, 0);
      };

      // Polling to detect input value changes (fallback if events don't work)
      const pollInterval = setInterval(() => {
        try {
          const currentValue = input.value;
          if (currentValue !== lastValue) {
            lastValue = currentValue;
            fetchPredictions(currentValue);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 100);

      // Hide dropdown when clicking outside
      const handleOutsideClick = (e: MouseEvent) => {
        if (dropdown.style.display === 'block' && !dropdown.contains(e.target as Node) && e.target !== input) {
          dropdown.style.display = 'none';
          isDropdownVisible = false;
        }
      };
      document.addEventListener('click', handleOutsideClick);

      const handleInput = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        fetchPredictions(value);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        const value = (e.target as HTMLInputElement).value;
        fetchPredictions(value);
      };

      input.addEventListener('input', handleInput);
      input.addEventListener('keydown', handleKeyDown);

      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);

      return () => {
        if (dropdown && dropdown.parentNode) {
          dropdown.parentNode.removeChild(dropdown);
        }
        input.removeEventListener('input', handleInput);
        input.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('scroll', updateDropdownPosition);
        window.removeEventListener('resize', updateDropdownPosition);
        document.removeEventListener('click', handleOutsideClick);
        clearInterval(pollInterval);
        clearTimeout(debounceTimer);
      };
    };

    // Wait for Google to load if not available
    if (!window.google || !window.google.maps) {
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogle);
          initializeAutocomplete();
        }
      }, 100);
      return () => clearInterval(checkGoogle);
    }

    // Google is already loaded, initialize immediately
    initializeAutocomplete();
  }, [shouldInitialize, inputRef]);

  return {
    selectedAddress,
  };
}
