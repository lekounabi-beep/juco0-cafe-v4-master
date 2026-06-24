'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clearDriverSession, getDriverSession, isDriverSessionActive } from '@/lib/auth/driver-session';
import { isUUID } from '@/shared/utils/uuid';
import { useSafeRouter } from '@/hooks/useSafeRouter';

export function DriverGuard({ children }: { children: React.ReactNode }) {
  const { replaceWhenReady } = useSafeRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/driver/login';
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = () => {
      if (cancelled) return;

      const sessionActive = isDriverSessionActive();

      if (isLoginPage) {
        if (sessionActive) {
          replaceWhenReady('/driver');
          return;
        }
        setChecked(true);
        return;
      }

      if (!sessionActive) {
        replaceWhenReady('/driver/login');
        return;
      }

      const session = getDriverSession();
      if (!session || !isUUID(session.driver_id)) {
        console.error('Invalid driver_id detected', session?.driver_id);
        clearDriverSession();
        replaceWhenReady('/driver/login');
        return;
      }

      setChecked(true);
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [isLoginPage, pathname, replaceWhenReady]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
