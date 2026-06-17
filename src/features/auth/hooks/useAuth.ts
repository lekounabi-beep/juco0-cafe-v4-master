/**
 * Auth hook - manages authentication state
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/auth-store';
import { getCurrentUser, getCurrentSession } from '@/integrations/supabase/services/auth.service';

export function useAuth() {
  const { user, session, loading, setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Only load if we don't have user/session data yet
    if (user !== null || session !== null) {
      return;
    }

    async function loadAuth() {
      try {
        setLoading(true);
        const [currentUser, currentSession] = await Promise.all([
          getCurrentUser(),
          getCurrentSession(),
        ]);
        setUser(currentUser);
        setSession(currentSession);
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAuth();
  }, [user, session, setUser, setSession, setLoading]);

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
  };
}
