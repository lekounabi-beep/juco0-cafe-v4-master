/**
 * Profile service for Supabase
 */

// @ts-nocheck - Supabase types don't include new tables yet

import { supabase } from '@/integrations/supabase/client';
import type { Profile, ProfileUpdate, ProfileCreate } from '@/features/account/types/account.types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile not found
      return null;
    }
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data as Profile;
}

export async function updateProfile(userId: string, updateData: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data as Profile;
}

export async function createProfile(data: ProfileCreate): Promise<Profile> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return profile as Profile;
}

export async function getOrCreateProfile(userId: string, email?: string, fullName?: string): Promise<Profile> {
  // Try to get existing profile
  const profile = await getProfile(userId);
  if (profile) {
    // Check if profile.id is the same as user_id (which is wrong - should be different UUIDs)
    if (profile.id === userId) {
      // Delete the bad profile
      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', userId);
      if (deleteError) {
        console.error('Failed to delete bad profile:', deleteError);
        throw new Error(`Failed to delete bad profile: ${deleteError.message}`);
      }
      // Create a new profile with correct ID structure
      const profileData: ProfileCreate = {
        id: crypto.randomUUID(), // Generate a new UUID for the profile
        user_id: userId,
        email: email || '',
        full_name: fullName || '',
        phone: '',
      };
      return await createProfile(profileData);
    }
    return profile;
  }

  // Profile doesn't exist, create it
  const profileData: ProfileCreate = {
    id: crypto.randomUUID(), // Generate a new UUID for the profile
    user_id: userId,
    email: email || '',
    full_name: fullName || '',
    phone: '',
  };

  return await createProfile(profileData);
}
