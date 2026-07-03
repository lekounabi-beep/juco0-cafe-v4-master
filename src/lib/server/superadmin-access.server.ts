/**
 * SuperAdmin access gate — feature flag plus admin session (server actions).
 */

import { requireAdminSession } from "@app/actions/admin-auth";
import { isSuperAdminEnabled } from "@/features/superadmin/config/superadmin-flag";

export async function assertSuperAdminAccess(): Promise<void> {
  if (!isSuperAdminEnabled()) {
    throw new Error("SuperAdmin is disabled");
  }

  await requireAdminSession();
}
