/**
 * Address Autocomplete component wrapper
 */

import { forwardRef } from 'react';
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete';

interface AddressAutocompleteProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  shouldInitialize?: boolean;
  onAddressSelect?: (address: string, coords: { lat: number; lng: number }) => void;
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  ({ inputRef, shouldInitialize = true, onAddressSelect }, ref) => {
    useAddressAutocomplete(inputRef, shouldInitialize, onAddressSelect);

    return null; // This is a headless component
  }
);

AddressAutocomplete.displayName = 'AddressAutocomplete';
