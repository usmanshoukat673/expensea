import { createClient } from '@/lib/supabase/server';
import type { RecurringExpenseWithCategory } from '@/lib/database.types';

export async function getRecurringExpenses(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*, expense_categories(id, name, icon, color, slug)')
    .eq('team_id', teamId)
    .order('next_run_date', { ascending: true });

  return {
    recurringExpenses: (data ?? []) as RecurringExpenseWithCategory[],
    error,
  };
}

export async function getUpcomingRecurringExpenses(teamId: string, limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('recurring_expenses')
    .select('*, expense_categories(id, name, icon, color, slug)')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('next_run_date', { ascending: true })
    .limit(limit);

  return (data ?? []) as RecurringExpenseWithCategory[];
}
