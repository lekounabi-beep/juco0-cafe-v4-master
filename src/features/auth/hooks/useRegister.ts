/**
 * Register hook - handles email/password registration
 */

import { useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { signUpWithEmail } from '@/integrations/supabase/services/auth.service';

export function useRegister() {
  const { setUser, setSession, setError } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const register = async (email: string, password: string, fullName: string, phone?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await signUpWithEmail({ email, password, fullName, phone });
      setUser(data.user);
      setSession(data.session);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    register,
    loading,
  };
}
