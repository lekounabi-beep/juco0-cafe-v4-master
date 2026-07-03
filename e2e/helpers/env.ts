export function isLiveE2E(): boolean {
  return process.env.E2E_LIVE === "1" || process.env.E2E_LIVE === "true";
}

export function adminCredentials(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}
