/**
 * Login hook - handles email/password login
 */

import { useState } from "react";
import { useAuthStore } from "../store/auth-store";
import { signInWithEmail } from "@/integrations/supabase/services/auth.service";

export function useLogin() {
  const { setUser, setSession, setError } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await signInWithEmail(email, password);
      setUser(data.user);
      setSession(data.session);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    loading,
  };
}
