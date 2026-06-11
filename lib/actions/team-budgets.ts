'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { budgetSchema } from '@/lib/validations';
import { notifyTeamMembers, recordActivity } from '@/lib/activity';
import { notifyBudgetThresholds } from '@/lib/budget-alerts';
import { formatCurrencyAmount } from '@/lib/currency';
export type ActionResult = { error?: string; success?: boolean };

const BUDGET_PATHS = ['/', '/budgets', '/analytics', '/notifications', '/activity'] as const;

function formatBudgetAmount(amount: number | string | null | undefined) {
  return formatCurrencyAmount(Number(amount ?? 0));
}

function revalidateBudgetPaths() {
  for (const p of BUDGET_PATHS) revalidatePath(p);
}

function parseMonth(month?: string | null): string | null {
  if (!month || month === 'recurring') return null;
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month.slice(0, 8) + '01';
  return null;
}

function formatBudgetSlot(month: string | null) {
  if (!month) return 'every month';
  return new Date(`${month}T00:00:00`).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
}

function duplicateBudgetMessage(type: 'monthly' | 'category', month: string | null) {
  const slot = formatBudgetSlot(month);
  return type === 'monthly'
    ? `A monthly team budget already exists for ${slot}. Edit the existing budget instead.`
    : `A category budget already exists for ${slot}. Edit the existing budget instead.`;
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

async function findDuplicateBudget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    teamId,
    type,
    categoryId,
    month,
    excludeId,
  }: {
    teamId: string;
    type: 'monthly' | 'category';
    categoryId?: string | null;
    month: string | null;
    excludeId?: string;
  },
) {
  let query = supabase
    .from('team_budgets')
    .select('id')
    .eq('team_id', teamId)
    .eq('type', type)
    .limit(1);

  if (excludeId) query = query.neq('id', excludeId);
  query = month ? query.eq('month', month) : query.is('month', null);
  if (type === 'category') {
    if (!categoryId) return null;
    query = query.eq('category_id', categoryId);
  } else {
    query = query.is('category_id', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { error: error.message };
  if (data) return { error: duplicateBudgetMessage(type, month) };
  return null;
}

function normalizeBudgetError(error: { message?: string; code?: string } | null, type: 'monthly' | 'category', month: string | null) {
  if (!error) return 'Unable to save budget';
  if (
    error.code === '23505' ||
    error.message?.includes('idx_team_budgets_monthly_unique') ||
    error.message?.includes('idx_team_budgets_category_unique')
  ) {
    return duplicateBudgetMessage(type, month);
  }
  return error.message ?? 'Unable to save budget';
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
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please check the form and try again' };

  const supabase = await createClient();
  const categoryError = await validateBudgetCategory(
    supabase,
    session.teamId,
    parsed.data.type,
    parsed.data.categoryId,
  );
  if (categoryError) return { error: categoryError };
  const month = parseMonth(parsed.data.month);
  const duplicate = await findDuplicateBudget(supabase, {
    teamId: session.teamId,
    type: parsed.data.type,
    categoryId: parsed.data.categoryId,
    month,
  });
  if (duplicate?.error) return { error: duplicate.error };

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
    month,
    created_by: session.user.id,
  }).select('id').single();

  if (error) return { error: normalizeBudgetError(error, parsed.data.type, month) };
  if (budget) {
    await recordActivity(supabase, {
      teamId: session.teamId,
      userId: session.user.id,
      actionType: 'budget_created',
      entityType: 'budget',
      entityId: budget.id,
      message: `Budget created for ${formatBudgetAmount(parsed.data.amount)}`,
      metadata: { amount: parsed.data.amount, type: parsed.data.type },
    });
    await notifyTeamMembers({
      supabase,
      teamId: session.teamId,
      excludeUserId: session.user.id,
      type: 'info',
      title: 'Budget created',
      message: `A ${parsed.data.type} budget was created.`,
      link: '/budgets',
      metadata: { event_type: 'budget_created', budgetId: budget.id },
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
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please check the form and try again' };

  const supabase = await createClient();
  const categoryError = await validateBudgetCategory(
    supabase,
    session.teamId,
    parsed.data.type,
    parsed.data.categoryId,
  );
  if (categoryError) return { error: categoryError };
  const month = parseMonth(parsed.data.month);
  const duplicate = await findDuplicateBudget(supabase, {
    teamId: session.teamId,
    type: parsed.data.type,
    categoryId: parsed.data.categoryId,
    month,
    excludeId: id,
  });
  if (duplicate?.error) return { error: duplicate.error };

  const { error } = await supabase
    .from('team_budgets')
    .update({
      type: parsed.data.type,
      category_id: parsed.data.type === 'category' ? parsed.data.categoryId : null,
      amount: parsed.data.amount,
      month,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: normalizeBudgetError(error, parsed.data.type, month) };
  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'budget_updated',
    entityType: 'budget',
    entityId: id,
    message: `Budget updated to ${formatBudgetAmount(parsed.data.amount)}`,
    metadata: { amount: parsed.data.amount, type: parsed.data.type },
  });
  await notifyTeamMembers({
    supabase,
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'info',
    title: 'Budget updated',
    message: `A ${parsed.data.type} budget was updated.`,
    link: '/budgets',
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
  const { data: existing, error: fetchError } = await supabase
    .from('team_budgets')
    .select('id, type, amount')
    .eq('id', id)
    .eq('team_id', session.teamId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from('team_budgets')
    .delete()
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'budget_deleted',
    entityType: 'budget',
    entityId: id,
    message: `Budget deleted${existing?.amount ? ` for ${formatBudgetAmount(existing.amount)}` : ''}`,
    metadata: { amount: existing?.amount ?? null, type: existing?.type ?? null },
  });
  await notifyTeamMembers({
    supabase,
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'warning',
    title: 'Budget deleted',
    message: existing?.type
      ? `A ${existing.type} budget was deleted.`
      : 'A budget was deleted.',
    link: '/budgets',
    metadata: { event_type: 'budget_deleted', budgetId: id },
  });
  revalidateBudgetPaths();
  return { success: true };
}
