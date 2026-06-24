export const ADMIN_SESSION_KEY = 'admin_session';

export function isAdminSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function setAdminSession(): void {
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}
