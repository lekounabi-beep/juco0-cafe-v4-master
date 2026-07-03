/**
 * Addresses hook - manages user addresses
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getProfile } from "@/integrations/supabase/services/profile.service";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/integrations/supabase/services/address.service";
import type { Address, AddressCreate, AddressUpdate } from "@/features/account/types/account.types";

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAddresses() {
      if (!user) {
        setAddresses([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const profile = await getProfile(user.id);
        if (!profile) {
          setAddresses([]);
          return;
        }
        const data = await getAddresses(profile.id);
        setAddresses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load addresses");
      } finally {
        setLoading(false);
      }
    }

    loadAddresses();
  }, [user]);

  const create = async (data: Omit<AddressCreate, "user_id">) => {
    if (!user) {
      setError("User not authenticated");
      return { success: false };
    }

    try {
      setLoading(true);
      setError(null);
      const profile = await getProfile(user.id);
      if (!profile) {
        setError("Profile not found");
        return { success: false };
      }
      const newAddress = await createAddress({ ...data, user_id: profile.id });
      setAddresses((prev) => [newAddress, ...prev]);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create address";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const update = async (addressId: string, updateData: AddressUpdate) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await updateAddress(addressId, updateData);
      setAddresses((prev) => prev.map((addr) => (addr.id === addressId ? updated : addr)));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update address";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const remove = async (addressId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteAddress(addressId);
      setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete address";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const setDefault = async (addressId: string) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await setDefaultAddress(addressId);
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          is_default: addr.id === addressId,
        })),
      );
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set default address";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    addresses,
    loading,
    error,
    create,
    update,
    remove,
    setDefault,
  };
}
