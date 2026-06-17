'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase automatically handles the code exchange from the URL
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          router.push('/login?error=auth_failed');
          return;
        }

        if (data.session) {
          // Session created successfully, redirect to home
          router.push('/');
        } else {
          // Try to get session from URL hash (OAuth flow)
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            router.push('/login?error=session_failed');
            return;
          }

          if (sessionData.session) {
            router.push('/');
          } else {
            router.push('/login?error=no_session');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/login?error=unknown');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-white/80">Completing authentication...</p>
      </div>
    </div>
  );
}
