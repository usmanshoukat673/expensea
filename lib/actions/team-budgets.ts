'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { budgetSchema } from '@/lib/validations';
export type ActionResult = { error?: string; success?: boolean };

const BUDGET_PATHS = ['/', '/budgets', '/analytics'] as const;

function revalidateBudgetPaths() {
  for (const p of BUDGET_PATHS) revalidatePath(p);
}

function parseMonth(month?: string | null): string | null {
  if (!month || month === 'recurring') return null;
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month.slice(0, 8) + '01';
  return null;
}

export async function createTeamBudget(formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const parsed = budgetSchema.safeParse({
    type: formData.get('type'),
    categoryId: formData.get('categoryId') || null,
    amount: formData.get('amount'),
    month: formData.get('month') || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const supabase = await createClient();
  const { data: team } = await supabase
    .from('teams')
    .select('currency')
    .eq('id', session.teamId)
    .single();

  const { error } = await supabase.from('team_budgets').insert({
    team_id: session.teamId,
    type: parsed.data.type,
    category_id: parsed.data.type === 'category' ? parsed.data.categoryId : null,
    amount: parsed.data.amount,
    currency: team?.currency ?? 'PKR',
    month: parseMonth(parsed.data.month),
    created_by: session.user.id,
  });

  if (error) return { error: error.message };
  revalidateBudgetPaths();
  return { success: true };
}

export async function updateTeamBudget(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const parsed = budgetSchema.safeParse({
    type: formData.get('type'),
    categoryId: formData.get('categoryId') || null,
    amount: formData.get('amount'),
    month: formData.get('month') || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('team_budgets')
    .update({
      type: parsed.data.type,
      category_id: parsed.data.type === 'category' ? parsed.data.categoryId : null,
      amount: parsed.data.amount,
      month: parseMonth(parsed.data.month),
    })
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidateBudgetPaths();
  return { success: true };
}

export async function deleteTeamBudget(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('team_budgets')
    .delete()
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidateBudgetPaths();
  return { success: true };
}
