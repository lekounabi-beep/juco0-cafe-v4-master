/**
 * Premium Wolt-style Checkout Location Picker Modal
 * Fixed center pin with map movement underneath
 * Live reverse geocoding and smooth animations
 * Fullscreen modal experience - no page navigation
 * 
 * PERSISTENT MAP MODAL ARCHITECTURE:
 * - Map container ALWAYS exists in DOM (no conditional rendering)
 * - Map initializes ONCE on component mount
 * - Modal state ONLY controls CSS visibility (opacity, transform, pointer-events)
 * - Map lifecycle is INDEPENDENT of modal open/close state
 * - Resize trigger bridges UI visibility to map rendering
 */

'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { mapEngine } from '../engine/MapEngine';
import { useMapState } from '../hooks/useMapState';
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Navigation, Loader2, X, CheckCircle, XCircle, Check } from 'lucide-react';
import { useCheckoutLocationStore } from '@/features/checkout/store/checkout-location-store';
import { useCheckoutForm } from '@/features/checkout/hooks/useCheckoutForm';

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

interface CheckoutLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AddressComponents {
  street: string;
  number: string;
  area: string;
  postalCode: string;
}

// Memoized Pin Component - Minimal Wolt-style
const PremiumPin = memo(({ isLifted, isBouncing }: { isLifted: boolean; isBouncing: boolean }) => (
  <div className="relative pointer-events-none">
    {/* Subtle center indicator */}
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/80" />
    
    {/* Minimal pin - reduced size */}
    <div
      className={`relative transition-transform duration-200 ${
        isLifted ? '-translate-y-1 scale-105' : ''
      }`}
      style={{
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
      }}
    >
      <MapPin className="h-8 w-8 text-red-500" />
    </div>
  </div>
));

PremiumPin.displayName = 'PremiumPin';

// Memoized Address Card Component
const AddressCard = memo(({
  addressComponents,
  isGeocoding,
  addressVisible,
  hasAdjustedMap,
  showInstruction,
}: {
  addressComponents: AddressComponents;
  isGeocoding: boolean;
  addressVisible: boolean;
  hasAdjustedMap: boolean;
  showInstruction: boolean;
}) => (
  <div className="flex items-start gap-3">
    <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-red-500" />
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-semibold text-white">
        Delivery Location
      </h3>
      {isGeocoding ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="animate-pulse">Finding address...</span>
        </div>
      ) : addressComponents.street || addressComponents.area ? (
        <div className={`mt-2 space-y-1 transition-opacity duration-300 ${addressVisible ? 'opacity-100' : 'opacity-0'}`}>
          {addressComponents.street && addressComponents.number && (
            <p className="text-base font-medium text-white truncate">
              {addressComponents.street} {addressComponents.number}
            </p>
          )}
          {addressComponents.area && (
            <p className="text-sm text-gray-300 truncate">{addressComponents.area}</p>
          )}
          {addressComponents.postalCode && (
            <p className="text-xs text-gray-400">{addressComponents.postalCode}</p>
          )}
          {!hasAdjustedMap && showInstruction && (
            <p className="text-xs text-gray-400 mt-1">
              Adjust the map to pinpoint your exact location
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-400">
          Search for an address or move the map
        </p>
      )}
    </div>
  </div>
));

AddressCard.displayName = 'AddressCard';

// Memoized Confirm Button Component
const ConfirmButton = memo(({
  onClick,
  disabled,
  isFlying,
  isValid,
  hasAdjustedMap,
  isConfirming,
}: {
  onClick: () => void;
  disabled: boolean;
  isFlying: boolean;
  isValid: boolean | null;
  hasAdjustedMap: boolean;
  isConfirming: boolean;
}) => (
  <Button
    onClick={onClick}
    disabled={disabled || isConfirming}
    className="h-14 w-full bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-600 disabled:text-gray-400 text-base font-semibold transition-all active:scale-[0.98]"
  >
    {isConfirming ? (
      <span className="flex items-center gap-2">
        <Check className="h-5 w-5" />
        <span>Confirmed!</span>
      </span>
    ) : isFlying ? (
      <span className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Flying to location...
      </span>
    ) : isValid === false ? (
      'Outside delivery area'
    ) : !hasAdjustedMap ? (
      'Adjust map to confirm location'
    ) : (
      'Confirm Location'
    )}
  </Button>
));

ConfirmButton.displayName = 'ConfirmButton';

export function CheckoutLocationPicker({ isOpen, onClose }: CheckoutLocationPickerProps) {
  // Mount/unmount logging
  useEffect(() => {
    console.log('[CheckoutLocationPicker] MOUNT');
    return () => console.log('[CheckoutLocationPicker] UNMOUNT');
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // NEW: Use MapEngine state subscription
  const { isReady, center, zoom, address: mapAddress, isDragging, setCenter: setCenterImperative } = useMapState();

  const { location: existingLocation, setLocation, setDeliveryAvailable } = useCheckoutLocationStore();
  const { setCoords, setAddress: setFormAddress } = useCheckoutForm();

  const [address, setAddress] = useState(existingLocation?.formatted_address || '');
  const [coords, setCoordsState] = useState<{ lat: number; lng: number } | null>(
    existingLocation ? { lat: existingLocation.lat, lng: existingLocation.lng } : null
  );
  const [addressComponents, setAddressComponents] = useState<AddressComponents>({
    street: '',
    number: '',
    area: '',
    postalCode: '',
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [pinBounce, setPinBounce] = useState(false);
  const [isPinLifted, setIsPinLifted] = useState(false);
  const [entranceNotes, setEntranceNotes] = useState(existingLocation?.entrance_notes || '');
  const [showInstruction, setShowInstruction] = useState(false);
  const [hasAdjustedMap, setHasAdjustedMap] = useState(false);
  const [deliveryValidation, setDeliveryValidation] = useState<{
    isValid: boolean | null;
    message: string;
  }>({ isValid: null, message: '' });
  const [addressVisible, setAddressVisible] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  // Initialize MapEngine on mount
  useEffect(() => {
    if (mapContainerRef.current && !mapEngine.isReady()) {
      mapEngine.attach(mapContainerRef.current).catch((error) => {
        console.error('[CheckoutLocationPicker] Failed to initialize map:', error);
      });
    }
  }, []);

  // Subscribe to MapEngine events for UI updates
  useEffect(() => {
    const unsubscribeDragStart = mapEngine.on('DRAG_START', () => {
      setAddressVisible(false);
      setIsPinLifted(true);
    });

    const unsubscribeDragEnd = mapEngine.on('DRAG_END', (newCoords) => {
      setIsPinLifted(false);
      setPinBounce(true);
      setHasAdjustedMap(true);
      setCoordsState(newCoords);

      setTimeout(() => {
        setPinBounce(false);
      }, 300);
    });

    const unsubscribeAddressChanged = mapEngine.on('ADDRESS_CHANGED', (addr) => {
      setAddress(addr.formatted);
      setAddressComponents(addr.components);
      setAddressVisible(true);
      triggerHaptic(5);
    });

    return () => {
      unsubscribeDragStart();
      unsubscribeDragEnd();
      unsubscribeAddressChanged();
    };
  }, []);

  // Initialize autocomplete
  useAddressAutocomplete(inputRef as React.RefObject<HTMLInputElement>, isOpen, (selectedAddress, selectedCoords) => {
    setCenterImperative(selectedCoords.lat, selectedCoords.lng);
    setShowInstruction(true);
    setHasAdjustedMap(false);
    triggerHaptic(10);
  });

  // If we have existing location, center on it using MapEngine
  useEffect(() => {
    if (isReady && isOpen && existingLocation) {
      setCenterImperative(existingLocation.lat, existingLocation.lng);
    }
  }, [isReady, isOpen, existingLocation, setCenterImperative]);

  // Validate delivery zone
  const validateDeliveryZone = useCallback(async (coords: { lat: number; lng: number }) => {
    // TODO: Implement actual delivery zone validation
    // For now, assume all locations are valid
    // In production, check against delivery zone polygon or radius
    const isValid = true;
    setDeliveryValidation({
      isValid,
      message: isValid ? '✓ Delivery available' : 'Outside delivery area',
    });
    setDeliveryAvailable(isValid);
    return isValid;
  }, [setDeliveryAvailable]);

  // Handle confirm with success animation
  const handleConfirm = async () => {
    console.log('[CONFIRM] Starting');
    if (!coords || !address) return;

    // Validate delivery zone
    const isValid = await validateDeliveryZone(coords);
    if (!isValid) return;

    setIsConfirming(true);
    triggerHaptic([20, 30, 20]);

    // Success animation before closing
    setTimeout(() => {
      const locationData = {
        formatted_address: address,
        lat: coords.lat,
        lng: coords.lng,
        entrance_notes: entranceNotes || undefined,
      };

      setLocation(locationData);
      console.log('[STATE CHANGE] setLocation', locationData);
      setCoords(coords);
      console.log('[STATE CHANGE] setCoords', coords);
      setFormAddress(address);
      console.log('[STATE CHANGE] setFormAddress', address);
      
      setTimeout(() => {
        onClose();
        setIsConfirming(false);
      }, 400);
    }, 600);
  };

  const canConfirm = coords && address && !isGeocoding && !isFlying && hasAdjustedMap && deliveryValidation.isValid !== false;

  // UI Layer - Modal visibility controlled by CSS only (no conditional rendering)
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-black transition-all duration-300 ${
        isOpen
          ? 'opacity-100 pointer-events-auto translate-x-0'
          : 'opacity-0 pointer-events-none translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="relative z-30 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md px-4 py-3">
        <button
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-semibold text-white">
          Select Delivery Location
        </h1>
        <div className="h-9 w-9" /> {/* Spacer for centering */}
      </div>

      {/* Map Container */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={mapContainerRef} data-map-container="true" className="absolute inset-0 z-0" />

        {/* Fixed Center Pin with Premium Styling */}
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full">
          <PremiumPin isLifted={isPinLifted} isBouncing={pinBounce} />
        </div>

        {/* Center Crosshair - visible on drag */}
        {isDragging && (
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative w-8 h-8">
              {/* Horizontal line */}
              <div className="absolute left-0 top-1/2 w-full h-px bg-white/60" />
              {/* Vertical line */}
              <div className="absolute left-1/2 top-0 h-full w-px bg-white/60" />
              {/* Center dot */}
              <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full" />
            </div>
          </div>
        )}

        {/* Address Search Input */}
        <div className="absolute left-4 right-4 top-4 z-30">
          <div className="glass-strong rounded-xl p-2">
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12 bg-transparent pl-10 pr-4 text-white placeholder:text-gray-400 focus-visible:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Instruction Banner */}
        {showInstruction && (
          <div className="absolute left-4 right-4 top-20 z-30 animate-fade-in">
            <div className="glass-strong rounded-xl p-3 text-center">
              <p className="text-sm font-medium text-white">
                Move the map until the pin is exactly on your entrance
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Card with Premium Glass Effect */}
      <div className="relative z-30 border-t border-white/10 bg-black/70 backdrop-blur-xl p-4 safe-area-inset-bottom">
        <div className="glass-strong rounded-3xl p-5 space-y-4 shadow-2xl">
          {/* Address Display */}
          <AddressCard
            addressComponents={addressComponents}
            isGeocoding={isGeocoding}
            addressVisible={addressVisible}
            hasAdjustedMap={hasAdjustedMap}
            showInstruction={showInstruction}
          />

          {/* Delivery Zone Validation */}
          {deliveryValidation.isValid !== null && (
            <div className={`flex items-center gap-2 text-sm ${
              deliveryValidation.isValid ? 'text-green-400' : 'text-red-400'
            }`}>
              {deliveryValidation.isValid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>{deliveryValidation.message}</span>
            </div>
          )}

          {/* Entrance Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Additional delivery instructions (optional)
            </label>
            <Textarea
              placeholder="Blue building, 2nd floor, Bell Papadopoulos"
              value={entranceNotes}
              onChange={(e) => setEntranceNotes(e.target.value)}
              className="min-h-[80px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-0 resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-400 text-right">
              {entranceNotes.length}/200
            </p>
          </div>

          {/* Confirm Button */}
          <ConfirmButton
            onClick={handleConfirm}
            disabled={!canConfirm}
            isFlying={isFlying}
            isValid={deliveryValidation.isValid}
            hasAdjustedMap={hasAdjustedMap}
            isConfirming={isConfirming}
          />
        </div>
      </div>
    </div>
  );
}
