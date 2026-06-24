/**
 * Wake Lock hook
 * Manages screen wake lock for active deliveries
 */

import { useEffect, useState, useRef } from 'react';

interface UseWakeLockReturn {
  isWakeLockActive: boolean;
}

export function useWakeLock(isOnDelivery: boolean): UseWakeLockReturn {
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!isOnDelivery) {
      if (wakeLockRef.current) {
        void wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsWakeLockActive(false);
      }
      return;
    }

    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const lock = await navigator.wakeLock.request('screen');
          if (cancelled) {
            void lock.release();
            return;
          }
          wakeLockRef.current = lock;
          setIsWakeLockActive(true);
        }
      } catch {
        // Wake lock not supported or denied — non-critical
      }
    };

    void requestWakeLock();

    return () => {
      cancelled = true;
      if (wakeLockRef.current) {
        void wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [isOnDelivery]);

  return { isWakeLockActive };
}
