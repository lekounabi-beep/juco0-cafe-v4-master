import { isUUID } from '@/shared/utils/uuid';

export const DRIVER_SESSION_KEY = 'driver_session';
/** Cookie mirror so middleware can redirect /driver without client JS (mobile/PWA). */
export const DRIVER_AUTH_COOKIE = 'driver_auth';

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type DriverSession = {
  driver_id: string;
  full_name: string;
};

function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // iOS private mode / storage full
  }
}

function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function setDriverAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DRIVER_AUTH_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

export function clearDriverAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DRIVER_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getDriverSession(): DriverSession | null {
  const raw = safeLocalStorageGet(DRIVER_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;

    const driverId = parsed.driver_id ?? parsed.id;
    if (!driverId || !isUUID(driverId)) return null;

    const fullName = parsed.full_name ?? parsed.username;
    if (!fullName) return null;

    return { driver_id: driverId, full_name: fullName };
  } catch {
    return null;
  }
}

export function setDriverSession(session: DriverSession): void {
  if (!isUUID(session.driver_id)) {
    throw new Error('driver_id must be a valid UUID');
  }
  safeLocalStorageSet(DRIVER_SESSION_KEY, JSON.stringify(session));
  setDriverAuthCookie();
}

export function clearDriverSession(): void {
  safeLocalStorageRemove(DRIVER_SESSION_KEY);
  clearDriverAuthCookie();
}

export function isDriverSessionActive(): boolean {
  return getDriverSession() !== null;
}

/** Restore auth cookie from localStorage (e.g. after middleware sent user to login). */
export function ensureDriverSessionCookie(): boolean {
  if (!getDriverSession()) return false;
  setDriverAuthCookie();
  return true;
}
