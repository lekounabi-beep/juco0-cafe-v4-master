/**
 * Register page
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { GoogleButton } from '@/features/auth/components/GoogleButton';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function RegisterPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/account');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-4">
      <RegisterForm />
      <div className="mx-auto max-w-md px-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-black/40 px-2 text-white/40">ή</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-md px-4">
        <GoogleButton />
      </div>
    </div>
  );
}
