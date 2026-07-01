'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from './admin-auth';

export async function revalidateMenu() {
  try {
    await requireAdminSession();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  revalidatePath('/');
  return { success: true };
}
