/**
 * Driver service for Supabase operations
 */

// @ts-nocheck - Supabase types don't include new tables yet

import { supabase } from '@/integrations/supabase/client';
import type { DriverProfile, DriverAvailability, DriverLocationUpdateInput } from '@/features/delivery/types/delivery.types';
import type { Coordinates } from '@/shared/types/common.types';

export interface CreateDriverInput {
  user_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  vehicle_type?: string;
  vehicle_plate?: string | null;
}

export async function createDriver(
  input: CreateDriverInput
): Promise<DriverProfile> {
  const payload = {
    user_id: input.user_id,
    full_name: input.full_name,
    phone: input.phone,
    email: input.email || null,
    vehicle_type: input.vehicle_type || 'car',
    vehicle_plate: input.vehicle_plate || null,
    availability_status: 'offline',
    is_active: true,
  };

  const { data, error } = await supabase
    .from('drivers' as any)
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error(`Failed to create driver: ${error.message}`);
  }

  return data as DriverProfile;
}

export async function getDriverByUserId(userId: string): Promise<DriverProfile | null> {
  const { data, error } = await supabase
    .from('drivers' as any)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Supabase fetch error:', error);
    throw new Error(`Failed to fetch driver: ${error.message}`);
  }

  return data as DriverProfile;
}

export async function getDriverById(driverId: string): Promise<DriverProfile | null> {
  const { data, error } = await supabase
    .from('drivers' as any)
    .select('*')
    .eq('id', driverId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Supabase fetch error:', error);
    throw new Error(`Failed to fetch driver: ${error.message}`);
  }

  return data as DriverProfile;
}

export async function updateDriverAvailability(
  driverId: string,
  availabilityStatus: DriverAvailability,
  currentLocation?: Coordinates
): Promise<void> {
  const updateData: any = {
    availability_status: availabilityStatus,
  };

  if (currentLocation) {
    updateData.current_location_lat = currentLocation.lat;
    updateData.current_location_lng = currentLocation.lng;
    updateData.last_location_update = new Date().toISOString();
  }

  const { error } = await supabase
    .from('drivers' as any)
    .update(updateData)
    .eq('id', driverId);

  if (error) {
    console.error('Supabase update error:', error);
    throw new Error(`Failed to update driver availability: ${error.message}`);
  }
}

export async function updateDriverLocation(
  input: DriverLocationUpdateInput
): Promise<void> {
  const updateData: any = {
    current_location_lat: input.lat,
    current_location_lng: input.lng,
    last_location_update: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('drivers' as any)
    .update(updateData)
    .eq('id', input.driver_id);

  if (error) {
    console.error('Supabase update error:', error);
    throw new Error(`Failed to update driver location: ${error.message}`);
  }
}

export async function getOnlineDrivers(): Promise<DriverProfile[]> {
  const { data, error } = await supabase
    .from('drivers' as any)
    .select('*')
    .eq('availability_status', 'online')
    .eq('is_active', true);

  if (error) {
    console.error('Supabase fetch error:', error);
    throw new Error(`Failed to fetch online drivers: ${error.message}`);
  }

  return data as DriverProfile[];
}

export async function getAvailableDrivers(): Promise<DriverProfile[]> {
  const { data, error } = await supabase
    .from('drivers' as any)
    .select('*')
    .eq('availability_status', 'online')
    .eq('is_active', true);

  if (error) {
    console.error('Supabase fetch error:', error);
    throw new Error(`Failed to fetch available drivers: ${error.message}`);
  }

  return data as DriverProfile[];
}

export async function incrementDriverDeliveries(driverId: string): Promise<void> {
  // First fetch current value
  const { data: driver } = await supabase
    .from('drivers' as any)
    .select('total_deliveries')
    .eq('id', driverId)
    .single();

  if (!driver) {
    throw new Error('Driver not found');
  }

  const newTotal = (driver.total_deliveries || 0) + 1;

  const { error } = await supabase
    .from('drivers' as any)
    .update({ 
      total_deliveries: newTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', driverId);

  if (error) {
    console.error('Supabase update error:', error);
    throw new Error(`Failed to increment driver deliveries: ${error.message}`);
  }
}

export async function updateDriverRating(
  driverId: string,
  rating: number
): Promise<void> {
  const { error } = await supabase
    .from('drivers' as any)
    .update({ 
      rating,
      updated_at: new Date().toISOString()
    })
    .eq('id', driverId);

  if (error) {
    console.error('Supabase update error:', error);
    throw new Error(`Failed to update driver rating: ${error.message}`);
  }
}

export async function deactivateDriver(driverId: string): Promise<void> {
  const { error } = await supabase
    .from('drivers' as any)
    .update({ 
      is_active: false,
      availability_status: 'offline',
      updated_at: new Date().toISOString()
    })
    .eq('id', driverId);

  if (error) {
    console.error('Supabase update error:', error);
    throw new Error(`Failed to deactivate driver: ${error.message}`);
  }
}
