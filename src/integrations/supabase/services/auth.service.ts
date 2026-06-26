/**
 * Authentication service for Supabase Auth
 */

import { supabase } from "@/integrations/supabase/client";
import type { LoginFormData, RegisterFormData } from "@/features/auth/types/auth.types";

function isAuthSessionMissingError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AuthSessionMissingError" || error.message.includes("Auth session missing"))
  );
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signUpWithEmail(data: RegisterFormData) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        phone: data.phone || null,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return authData;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      if (!isAuthSessionMissingError(sessionError)) {
        console.error("Failed to get current session:", sessionError);
      }
      return null;
    }

    if (!session) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (!isAuthSessionMissingError(error)) {
        console.error("Failed to get current user:", error);
      }
      return null;
    }

    return user;
  } catch (error) {
    // Handle AuthSessionMissingError and other auth errors gracefully
    if (!isAuthSessionMissingError(error)) {
      console.error("Auth error:", error);
    }
    return null;
  }
}

export async function getCurrentSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      if (!isAuthSessionMissingError(error)) {
        console.error("Failed to get current session:", error);
      }
      return null;
    }

    return session;
  } catch (error) {
    // Handle AuthSessionMissingError and other auth errors gracefully
    if (!isAuthSessionMissingError(error)) {
      console.error("Auth error:", error);
    }
    return null;
  }
}
