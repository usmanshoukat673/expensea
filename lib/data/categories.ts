import { createClient } from '@/lib/supabase/server';
import type { ExpenseCategory } from '@/lib/database.types';

export async function getTeamCategories(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('team_id', teamId)
    .order('name');

  return { categories: (data ?? []) as ExpenseCategory[], error };
}

export async function getCategoryUsageCounts(teamId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lunch_entries')
    .select('category_id')
    .eq('team_id', teamId)
    .not('category_id', 'is', null);

  const counts = new Map<string, number>();
  (data ?? []).forEach((row) => {
    if (row.category_id) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
  });
  return counts;
}

export async function getDefaultCategory(teamId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('team_id', teamId)
    .eq('slug', 'miscellaneous')
    .maybeSingle();
  return data as ExpenseCategory | null;
}
