/**
 * Delivery Step component - Step 2 of checkout
 */

import { useRef, useEffect } from 'react';
import { CheckoutField } from './CheckoutField';
import { GoogleMap } from '@/features/maps/components/GoogleMap';
import { AddressAutocomplete } from '@/features/maps/components/AddressAutocomplete';
import { LocationButton } from '@/features/maps/components/LocationButton';
import { useCheckoutForm } from '../hooks/useCheckoutForm';
import { useMapsStore } from '@/features/maps/store/maps-store';

export function DeliveryStep() {
  const addressInputRef = useRef<HTMLInputElement>(null);
  const { 
    name, setName, 
    phone, setPhone, 
    address, setAddress, 
    addressNotes, setAddressNotes, 
    notes, setNotes,
    setCoords 
  } = useCheckoutForm();
  
  const { setMapCenter, panToLocation: storePanToLocation } = useMapsStore();

  // Sync maps store with form state
  useEffect(() => {
    const unsubscribe = useMapsStore.subscribe(
      (state) => {
        const selectedAddress = state.selectedAddress;
        if (selectedAddress && selectedAddress !== address) {
          setAddress(selectedAddress);
        }
      }
    );
    return unsubscribe;
  }, [setAddress, address]);

  useEffect(() => {
    const unsubscribe = useMapsStore.subscribe(
      (state) => {
        const selectedCoords = state.selectedCoords;
        if (selectedCoords) {
          setCoords(selectedCoords);
        }
      }
    );
    return unsubscribe;
  }, [setCoords]);

  const handleAddressSelect = (selectedAddress: string, coords: { lat: number; lng: number }) => {
    setAddress(selectedAddress);
    setCoords(coords);
    setMapCenter(coords);
  };

  const handleLocationFound = (coords: { lat: number; lng: number }) => {
    setCoords(coords);
    setMapCenter(coords);
    if (storePanToLocation) {
      storePanToLocation(coords.lat, coords.lng);
    }
  };

  return (
    <section className="space-y-4 animate-fade-up">
      <h2 className="text-xl font-semibold text-white">Στοιχεία παράδοσης</h2>

      <CheckoutField label="Ονοματεπώνυμο" value={name} onChange={setName} placeholder="Π.χ. Γιώργος Παπαδόπουλος" />
      <CheckoutField label="Τηλέφωνο" value={phone} onChange={setPhone} placeholder="69XXXXXXXX" type="tel" />
      <CheckoutField label="Διεύθυνση" value={address} onChange={setAddress} placeholder="Οδός, αριθμός, πόλη" ref={addressInputRef} />
      <CheckoutField label="Όροφος / Κουδούνι (προαιρετικό)" value={addressNotes} onChange={setAddressNotes} placeholder="Π.χ. 3ος όροφος, κουδούνι Παπαδόπουλος" />

      {/* Interactive Map */}
      <div className="relative w-full overflow-hidden rounded-2xl glass" style={{ height: '500px' }}>
        <GoogleMap shouldInitialize className="h-full w-full" />
        <AddressAutocomplete 
          inputRef={addressInputRef} 
          shouldInitialize 
          onAddressSelect={handleAddressSelect} 
        />
        <LocationButton onLocationFound={handleLocationFound} />
      </div>

      <CheckoutField label="Σχόλια παραγγελίας (προαιρετικό)" value={notes} onChange={setNotes} placeholder="Π.χ. χωρίς ζάχαρη" textarea />
    </section>
  );
}
