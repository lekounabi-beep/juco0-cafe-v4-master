/**
 * SuperAdmin console gate — requires NEXT_PUBLIC_SUPERADMIN_ENABLED=true
 * and a valid kitchen admin session (see SuperAdminGuard + assertSuperAdminAccess).
 */
export function isSuperAdminEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUPERADMIN_ENABLED === "true";
}
