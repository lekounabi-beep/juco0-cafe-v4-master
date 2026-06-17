/**
 * Address service for Supabase
 */

// @ts-nocheck - Supabase types don't include new tables yet

import { supabase } from '@/integrations/supabase/client';
import type { Address, AddressUpdate, AddressCreate } from '@/features/account/types/account.types';

export async function getAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses' as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch addresses: ${error.message}`);
  }

  return data as Address[];
}

export async function createAddress(createData: AddressCreate): Promise<Address> {
  // @ts-ignore - Supabase types don't include new tables yet
  const { data: address, error } = await supabase
    .from('addresses' as any)
    .insert({
      ...createData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create address: ${error.message}`);
  }

  return address as Address;
}

export async function updateAddress(addressId: string, updateData: AddressUpdate): Promise<Address> {
  // @ts-ignore - Supabase types don't include new tables yet
  const { data, error } = await supabase
    .from('addresses' as any)
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', addressId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update address: ${error.message}`);
  }

  return data as Address;
}

export async function deleteAddress(addressId: string): Promise<void> {
  // @ts-ignore - Supabase types don't include new tables yet
  const { error } = await supabase
    .from('addresses' as any)
    .delete()
    .eq('id', addressId);

  if (error) {
    throw new Error(`Failed to delete address: ${error.message}`);
  }
}

export async function setDefaultAddress(addressId: string): Promise<Address> {
  // @ts-ignore - Supabase types don't include new tables yet
  const { data, error } = await supabase
    .from('addresses' as any)
    .update({
      is_default: true,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', addressId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set default address: ${error.message}`);
  }

  return data as Address;
}
