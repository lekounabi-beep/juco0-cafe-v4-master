/**
 * Google Auth hook - handles Google OAuth
 */

import { useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { signInWithGoogle } from '@/integrations/supabase/services/auth.service';

export function useGoogleAuth() {
  const { setError } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const signInWithGoogleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithGoogle: signInWithGoogleAuth,
    loading,
  };
}
