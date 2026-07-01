'use client';

import { useCallback } from 'react';
import { clearDriverSession } from '@/lib/auth/driver-session';
import { driverLogout } from '../../../../app/actions/driver-login';
import { useSafeRouter } from '@/hooks/useSafeRouter';

/** Clears driver session and navigates to login. */
export function useDriverLogout() {
  const { replace } = useSafeRouter();

  return useCallback(async () => {
    await driverLogout();
    clearDriverSession();
    replace('/driver/login');
  }, [replace]);
}
