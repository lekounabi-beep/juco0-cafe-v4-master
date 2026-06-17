'use server';

import { revalidatePath } from 'next/cache';

export async function revalidateMenu() {
  revalidatePath('/');
  revalidatePath('/menu');
  return { success: true };
}
