/**
 * Temporary gate for SuperAdmin console.
 * Replace with real authentication when ready.
 */
export function isSuperAdminEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUPERADMIN_ENABLED === "true";
}
