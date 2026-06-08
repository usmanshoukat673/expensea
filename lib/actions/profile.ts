'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { profileSchema } from '@/lib/validations';

export type ActionResult = { error?: string; success?: boolean };

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const session = await requireAuth();
  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    avatarUrl: formData.get('avatarUrl') || '',
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please check the form and try again' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      avatar_url: parsed.data.avatarUrl || null,
    })
    .eq('id', session.user.id);

  if (error) return { error: error.message };
  revalidatePath('/settings/profile');
  return { success: true };
}
