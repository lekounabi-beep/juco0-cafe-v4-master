/**
 * Profile hook - manages user profile
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getProfile, updateProfile } from '@/integrations/supabase/services/profile.service';
import type { Profile, ProfileUpdate } from '@/features/account/types/account.types';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getProfile(user.id);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const update = async (updateData: ProfileUpdate) => {
    if (!user) {
      setError('User not authenticated');
      return { success: false };
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await updateProfile(user.id, updateData);
      setProfile(updated);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    update,
  };
}
