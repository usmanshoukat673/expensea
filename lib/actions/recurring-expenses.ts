'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { recurringExpenseSchema } from '@/lib/validations';
import { notifyTeamMembers } from '@/lib/notifications';
import { recordActivity } from '@/lib/activity';

export type ActionResult = { error?: string; success?: boolean; generated?: number };

function parseRecurringExpenseForm(formData: FormData) {
  return recurringExpenseSchema.safeParse({
    title: formData.get('title'),
    amount: formData.get('amount'),
    categoryId: formData.get('categoryId'),
    frequency: formData.get('frequency'),
    intervalValue: formData.get('intervalValue'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate') || null,
  });
}

async function validateCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  categoryId: string,
) {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('id', categoryId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) return error.message;
  return data ? null : 'Selected category does not belong to this team';
}

function revalidateRecurringPaths() {
  revalidatePath('/');
  revalidatePath('/entries');
  revalidatePath('/analytics');
  revalidatePath('/budgets');
  revalidatePath('/recurring-expenses');
}

export async function createRecurringExpense(formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot create recurring expenses' };

  const parsed = parseRecurringExpenseForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please check the form and try again' };

  const supabase = await createClient();
  const refError = await validateCategory(supabase, session.teamId, parsed.data.categoryId);
  if (refError) return { error: refError };

  const { data: row, error } = await supabase
    .from('recurring_expenses')
    .insert({
      team_id: session.teamId,
      created_by: session.user.id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      category_id: parsed.data.categoryId,
      frequency: parsed.data.frequency,
      interval_value: parsed.data.intervalValue,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate || null,
      next_run_date: parsed.data.startDate,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !row) return { error: error?.message ?? 'Failed to create recurring expense' };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'recurring_expense_created',
    entityType: 'expense',
    entityId: row.id,
    message: `Recurring expense created: ${parsed.data.title}`,
    metadata: { amount: parsed.data.amount, frequency: parsed.data.frequency },
  });

  revalidateRecurringPaths();
  return { success: true };
}

export async function updateRecurringExpense(id: string, formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot edit recurring expenses' };

  const parsed = parseRecurringExpenseForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please check the form and try again' };

  const supabase = await createClient();
  const refError = await validateCategory(supabase, session.teamId, parsed.data.categoryId);
  if (refError) return { error: refError };

  const { data: existing, error: existingError } = await supabase
    .from('recurring_expenses')
    .select('next_run_date, last_generated_at')
    .eq('id', id)
    .eq('team_id', session.teamId)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Recurring expense not found' };

  const nextRunDate =
    existing.last_generated_at && existing.next_run_date > parsed.data.startDate
      ? existing.next_run_date
      : parsed.data.startDate;

  const { error } = await supabase
    .from('recurring_expenses')
    .update({
      title: parsed.data.title,
      amount: parsed.data.amount,
      category_id: parsed.data.categoryId,
      frequency: parsed.data.frequency,
      interval_value: parsed.data.intervalValue,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate || null,
      next_run_date: nextRunDate,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'recurring_expense_updated',
    entityType: 'expense',
    entityId: id,
    message: `Recurring expense updated: ${parsed.data.title}`,
  });

  revalidateRecurringPaths();
  return { success: true };
}

export async function setRecurringExpenseActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot update recurring expenses' };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('recurring_expenses')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('team_id', session.teamId)
    .select('title')
    .single();

  if (error || !row) return { error: error?.message ?? 'Failed to update recurring expense' };

  const action = isActive ? 'resumed' : 'paused';
  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: `recurring_expense_${action}`,
    entityType: 'expense',
    entityId: id,
    message: `Recurring expense ${action}: ${row.title}`,
  });

  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'info',
    title: `Recurring expense ${action}`,
    body: `${row.title} was ${action}`,
    metadata: { recurringExpenseId: id },
  });

  revalidateRecurringPaths();
  return { success: true };
}

export async function deleteRecurringExpense(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot delete recurring expenses' };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('recurring_expenses')
    .select('title')
    .eq('id', id)
    .eq('team_id', session.teamId)
    .maybeSingle();

  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'recurring_expense_deleted',
    entityType: 'expense',
    entityId: id,
    message: `Recurring expense deleted${existing?.title ? `: ${existing.title}` : ''}`,
  });

  revalidateRecurringPaths();
  return { success: true };
}

export async function processDueRecurringExpenses(): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot run recurring expense generation' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('process_due_recurring_expenses', {
    p_team_id: session.teamId,
  });

  if (error) return { error: error.message };

  revalidateRecurringPaths();
  return { success: true, generated: data?.length ?? 0 };
}
