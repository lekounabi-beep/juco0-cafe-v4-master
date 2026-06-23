/**
 * Delivery Step component - Step 2 of checkout
 * Now uses fullscreen modal for precise location selection
 */

import { useRef, useEffect, useState } from 'react';
import { CheckoutField } from './CheckoutField';
import { CheckoutLocationPicker } from '@/features/maps/components/CheckoutLocationPicker';
import { useCheckoutForm } from '../hooks/useCheckoutForm';
import { useCheckoutLocationStore } from '../store/checkout-location-store';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

export function DeliveryStep() {
  const { 
    name, setName, 
    phone, setPhone, 
    address, setAddress, 
    addressNotes, setAddressNotes, 
    notes, setNotes,
    setCoords 
  } = useCheckoutForm();
  
  const { location: selectedLocation, setLocationPickerOpen, isLocationPickerOpen } = useCheckoutLocationStore();

  // Sync form with store location
  useEffect(() => {
    if (selectedLocation) {
      setAddress(selectedLocation.formatted_address);
      setCoords({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      if (selectedLocation.entrance_notes) {
        setAddressNotes(selectedLocation.entrance_notes);
      }
    }
  }, [selectedLocation, setAddress, setCoords, setAddressNotes]);

  const handleOpenLocationPicker = () => {
    setLocationPickerOpen(true);
  };

  const handleCloseLocationPicker = () => {
    setLocationPickerOpen(false);
  };

  return (
    <>
      <section className="space-y-4 animate-fade-up">
        <h2 className="text-xl font-semibold text-white">Στοιχεία παράδοσης</h2>

        <CheckoutField label="Ονοματεπώνυμο" value={name} onChange={setName} placeholder="Π.χ. Γιώργος Παπαδόπουλος" />
        <CheckoutField label="Τηλέφωνο" value={phone} onChange={setPhone} placeholder="69XXXXXXXX" type="tel" />
        
        {/* Address with Location Picker Button */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Διεύθυνση</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Οδός, αριθμός, πόλη"
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                readOnly
              />
            </div>
            <Button
              type="button"
              onClick={handleOpenLocationPicker}
              className="h-12 px-4 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl transition-colors"
            >
              <MapPin className="h-5 w-5" />
            </Button>
          </div>
          {selectedLocation && (
            <p className="text-xs text-gray-400">
              ✓ Location selected precisely
            </p>
          )}
        </div>

        <CheckoutField label="Όροφος / Κουδούνι (προαιρετικό)" value={addressNotes} onChange={setAddressNotes} placeholder="Π.χ. 3ος όροφος, κουδούνι Παπαδόπουλος" />

        <CheckoutField label="Σχόλια παραγγελίας (προαιρετικό)" value={notes} onChange={setNotes} placeholder="Π.χ. χωρίς ζάχαρη" textarea />
      </section>

      {/* Fullscreen Location Picker Modal - Always mounted, visibility controlled by CSS */}
      <CheckoutLocationPicker 
        isOpen={isLocationPickerOpen} 
        onClose={handleCloseLocationPicker} 
      />
    </>
  );
}
