/**
 * Wake Lock hook
 * Manages screen wake lock for active deliveries
 */

import { useEffect, useState } from 'react';

interface UseWakeLockReturn {
  isWakeLockActive: boolean;
}

export function useWakeLock(activeDelivery: any): UseWakeLockReturn {
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);

  useEffect(() => {
    if (!activeDelivery) {
      // Release wake lock when no active delivery
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
        setIsWakeLockActive(false);
      }
      return;
    }

    // Request wake lock when active delivery exists
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const lock = await (navigator as any).wakeLock.request('screen');
          setWakeLock(lock);
          setIsWakeLockActive(true);
        }
      } catch (err) {
        console.warn('Wake Lock not supported or denied:', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [activeDelivery, wakeLock]);

  return { isWakeLockActive };
}
