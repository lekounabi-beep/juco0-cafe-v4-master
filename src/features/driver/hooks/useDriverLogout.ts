'use client';

import { useCallback } from 'react';
import { clearDriverSession } from '@/lib/auth/driver-session';
import { useSafeRouter } from '@/hooks/useSafeRouter';

/** Clears driver localStorage session and navigates to login. */
export function useDriverLogout() {
  const { replace } = useSafeRouter();

  return useCallback(() => {
    clearDriverSession();
    replace('/driver/login');
  }, [replace]);
}
