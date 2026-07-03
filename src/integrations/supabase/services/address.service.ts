/**
 * Address service for Supabase
 */

import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Address, AddressUpdate, AddressCreate } from "@/features/account/types/account.types";

export async function getAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch addresses: ${error.message}`);
  }

  return data as Address[];
}

export async function createAddress(createData: AddressCreate): Promise<Address> {
  const insertData: TablesInsert<"addresses"> = {
    ...createData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: address, error } = await supabase
    .from("addresses")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create address: ${error.message}`);
  }

  return address as Address;
}

export async function updateAddress(
  addressId: string,
  updateData: AddressUpdate,
): Promise<Address> {
  const patch: TablesUpdate<"addresses"> = {
    ...updateData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("addresses")
    .update(patch)
    .eq("id", addressId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update address: ${error.message}`);
  }

  return data as Address;
}

export async function deleteAddress(addressId: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", addressId);

  if (error) {
    throw new Error(`Failed to delete address: ${error.message}`);
  }
}

export async function setDefaultAddress(addressId: string): Promise<Address> {
  const patch: TablesUpdate<"addresses"> = {
    is_default: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("addresses")
    .update(patch)
    .eq("id", addressId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set default address: ${error.message}`);
  }

  return data as Address;
}
