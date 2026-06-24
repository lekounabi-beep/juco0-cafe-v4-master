import { isUUID } from '@/shared/utils/uuid';

export const DRIVER_SESSION_KEY = 'driver_session';

export type DriverSession = {
  driver_id: string;
  full_name: string;
};

export function getDriverSession(): DriverSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(DRIVER_SESSION_KEY);
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
  localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(session));
}

export function clearDriverSession(): void {
  localStorage.removeItem(DRIVER_SESSION_KEY);
}

export function isDriverSessionActive(): boolean {
  return getDriverSession() !== null;
}
