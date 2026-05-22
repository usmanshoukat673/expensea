'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { categorySchema } from '@/lib/validations';
import { categorySlugify } from '@/lib/categories/defaults';

export type ActionResult = { error?: string; success?: boolean };

export async function createExpenseCategory(formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    icon: formData.get('icon'),
    color: formData.get('color'),
    description: formData.get('description') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const slug = categorySlugify(parsed.data.name);
  const supabase = await createClient();
  const { error } = await supabase.from('expense_categories').insert({
    team_id: session.teamId,
    name: parsed.data.name,
    slug,
    icon: parsed.data.icon,
    color: parsed.data.color,
    description: parsed.data.description ?? null,
    created_by: session.user.id,
  });

  if (error) return { error: error.message };
  revalidatePath('/categories');
  return { success: true };
}

export async function updateExpenseCategory(id: string, formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    icon: formData.get('icon'),
    color: formData.get('color'),
    description: formData.get('description') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('expense_categories')
    .update({
      name: parsed.data.name,
      slug: categorySlugify(parsed.data.name),
      icon: parsed.data.icon,
      color: parsed.data.color,
      description: parsed.data.description ?? null,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/categories');
  revalidatePath('/entries');
  return { success: true };
}

export async function deleteExpenseCategory(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/categories');
  return { success: true };
}
