/**
 * Profile service for Supabase
 */

import { supabase } from "@/integrations/supabase/client";
import { serverLog } from "@/lib/server/logger";
import type { TablesInsert } from "@/integrations/supabase/types";
import type { Profile, ProfileUpdate } from "@/features/account/types/account.types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Profile not found
      return null;
    }
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data as Profile;
}

export async function updateProfile(userId: string, updateData: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data as Profile;
}

export async function createProfile(data: TablesInsert<"profiles">): Promise<Profile> {
  const insertData: TablesInsert<"profiles"> = {
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return profile as Profile;
}

export async function getOrCreateProfile(
  userId: string,
  email?: string,
  fullName?: string,
): Promise<Profile> {
  // Try to get existing profile
  const profile = await getProfile(userId);
  if (profile) {
    // Check if profile.id is the same as user_id (which is wrong - should be different UUIDs)
    if (profile.id === userId) {
      // Delete the bad profile
      const { error: deleteError } = await supabase.from("profiles").delete().eq("id", userId);
      if (deleteError) {
        serverLog.warn("profile.delete_failed", {
          profileId: userId,
          error: deleteError.message,
        });
        throw new Error(`Failed to delete bad profile: ${deleteError.message}`);
      }
      // Create a new profile with correct ID structure
      const profileData: TablesInsert<"profiles"> = {
        id: crypto.randomUUID(),
        user_id: userId,
        email: email || "",
        full_name: fullName || "",
        phone: "",
      };
      return await createProfile(profileData);
    }
    return profile;
  }

  // Profile doesn't exist, create it
  const profileData: TablesInsert<"profiles"> = {
    id: crypto.randomUUID(),
    user_id: userId,
    email: email || "",
    full_name: fullName || "",
    phone: "",
  };

  return await createProfile(profileData);
}
