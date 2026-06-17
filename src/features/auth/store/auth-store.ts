/**
 * Auth store using Zustand
 * Manages authentication state
 */

import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

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
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

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
