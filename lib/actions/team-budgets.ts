'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { budgetSchema } from '@/lib/validations';
import { notifyTeamMembers, recordActivity } from '@/lib/activity';
import { notifyBudgetThresholds } from '@/lib/budget-alerts';
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

async function validateBudgetCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  type: 'monthly' | 'category',
  categoryId?: string | null,
) {
  if (type !== 'category' || !categoryId) return null;

  const { data, error } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('id', categoryId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) return error.message;
  if (!data) return 'Selected category does not belong to this team';
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
  const categoryError = await validateBudgetCategory(
    supabase,
    session.teamId,
    parsed.data.type,
    parsed.data.categoryId,
  );
  if (categoryError) return { error: categoryError };

  const { data: team } = await supabase
    .from('teams')
    .select('currency')
    .eq('id', session.teamId)
    .single();

  const { data: budget, error } = await supabase.from('team_budgets').insert({
    team_id: session.teamId,
    type: parsed.data.type,
    category_id: parsed.data.type === 'category' ? parsed.data.categoryId : null,
    amount: parsed.data.amount,
    currency: team?.currency ?? 'PKR',
    month: parseMonth(parsed.data.month),
    created_by: session.user.id,
  }).select('id').single();

  if (error) return { error: error.message };
  if (budget) {
    await recordActivity(supabase, {
      teamId: session.teamId,
      userId: session.user.id,
      actionType: 'budget_updated',
      entityType: 'budget',
      entityId: budget.id,
      message: `Budget created for ${parsed.data.amount}`,
      metadata: { amount: parsed.data.amount, type: parsed.data.type },
    });
    await notifyTeamMembers({
      supabase,
      teamId: session.teamId,
      excludeUserId: session.user.id,
      type: 'info',
      title: 'Budget updated',
      message: `A ${parsed.data.type} budget was created.`,
      metadata: { event_type: 'budget_updated', budgetId: budget.id },
    });
    await notifyBudgetThresholds(supabase, {
      teamId: session.teamId,
      actorId: session.user.id,
      excludeUserId: session.user.id,
    });
  }
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
  const categoryError = await validateBudgetCategory(
    supabase,
    session.teamId,
    parsed.data.type,
    parsed.data.categoryId,
  );
  if (categoryError) return { error: categoryError };

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
  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'budget_updated',
    entityType: 'budget',
    entityId: id,
    message: `Budget updated to ${parsed.data.amount}`,
    metadata: { amount: parsed.data.amount, type: parsed.data.type },
  });
  await notifyTeamMembers({
    supabase,
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'info',
    title: 'Budget updated',
    message: `A ${parsed.data.type} budget was updated.`,
    metadata: { event_type: 'budget_updated', budgetId: id },
  });
  await notifyBudgetThresholds(supabase, {
    teamId: session.teamId,
    actorId: session.user.id,
    excludeUserId: session.user.id,
  });
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
