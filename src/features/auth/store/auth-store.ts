/**
 * Auth store using Zustand
 * Manages authentication state
 */

import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user || null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  initializeAuth: async () => {
    try {
      set({ loading: true });
      
      // Check current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Failed to get session:', error);
        set({ user: null, session: null, loading: false });
        return;
      }
      
      if (session) {
        set({ user: session.user, session, loading: false });
      } else {
        set({ user: null, session: null, loading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, session: null, loading: false, error: 'Failed to initialize auth' });
    }
  },

  logout: async () => {
    const { signOut } = await import('@/integrations/supabase/services/auth.service');
    try {
      await signOut();
      set({ user: null, session: null, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Logout failed' });
    }
  },
}));
