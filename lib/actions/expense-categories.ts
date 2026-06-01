'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { categorySchema } from '@/lib/validations';
import { categorySlugify } from '@/lib/categories/defaults';
import { recordActivity } from '@/lib/activity';

export type ActionResult = { error?: string; success?: boolean };

const CATEGORY_PATHS = ['/', '/categories', '/entries', '/analytics', '/budgets'] as const;

function revalidateCategoryPaths() {
  for (const path of CATEGORY_PATHS) revalidatePath(path);
}

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
  const { data: category, error } = await supabase.from('expense_categories').insert({
    team_id: session.teamId,
    name: parsed.data.name,
    slug,
    icon: parsed.data.icon,
    color: parsed.data.color,
    description: parsed.data.description ?? null,
    created_by: session.user.id,
  }).select('id').single();

  if (error) return { error: error.message };
  if (category) {
    await recordActivity(supabase, {
      teamId: session.teamId,
      userId: session.user.id,
      actionType: 'category_created',
      entityType: 'category',
      entityId: category.id,
      message: `Category created: ${parsed.data.name}`,
      metadata: { name: parsed.data.name, color: parsed.data.color },
    });
  }
  revalidateCategoryPaths();
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
  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'category_updated',
    entityType: 'category',
    entityId: id,
    message: `Category updated: ${parsed.data.name}`,
    metadata: { name: parsed.data.name, color: parsed.data.color },
  });
  revalidateCategoryPaths();
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
  revalidateCategoryPaths();
  return { success: true };
}
