import { createClient } from '@/lib/supabase/server';
import type { ExpenseCategory, TeamBudget } from '@/lib/database.types';
import {
  buildExpenseSpendIndex,
  computeAllBudgetUsages,
  computeDashboardBudgetSummary,
  getAggregatedSpent,
  getMonthEnd,
  getMonthStart,
  type BudgetWithUsage,
  type DashboardBudgetSummary,
  type ExpenseRow,
} from '@/lib/budget/engine';

async function fetchMonthEntries(teamId: string, monthStart: string) {
  const supabase = await createClient();
  const monthEnd = getMonthEnd(monthStart);

  const { data } = await supabase
    .from('lunch_entries')
    .select('team_id, amount, lunch_date, category_id')
    .eq('team_id', teamId)
    .gte('lunch_date', monthStart)
    .lte('lunch_date', monthEnd);

  return (data ?? []) as ExpenseRow[];
}

export async function getTeamBudgets(teamId: string): Promise<TeamBudget[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('team_budgets')
    .select('*, expense_categories(id, name, color, icon)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  return (data ?? []) as TeamBudget[];
}

export async function getBudgetPageData(teamId: string, monthStart?: string) {
  const month = monthStart ?? getMonthStart();
  const supabase = await createClient();

  const [budgetsRes, entries, categoriesRes] = await Promise.all([
    supabase
      .from('team_budgets')
      .select('*, expense_categories(id, name, color, icon)')
      .eq('team_id', teamId)
      .order('type')
      .order('created_at', { ascending: false }),
    fetchMonthEntries(teamId, month),
    supabase
      .from('expense_categories')
      .select('*')
      .eq('team_id', teamId)
      .order('name'),
  ]);

  const budgets = (budgetsRes.data ?? []) as TeamBudget[];
  const categories = (categoriesRes.data ?? []) as ExpenseCategory[];
  const categoryMeta = new Map(
    categories.map((c) => [c.id, { name: c.name, color: c.color }]),
  );

  const usages = computeAllBudgetUsages(budgets, entries, month, categoryMeta);

  return { budgets, usages, categories, monthStart: month };
}

export async function getDashboardBudgetSummary(
  teamId: string,
): Promise<DashboardBudgetSummary> {
  const monthStart = getMonthStart();
  const [budgets, entries] = await Promise.all([
    getTeamBudgets(teamId),
    fetchMonthEntries(teamId, monthStart),
  ]);

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('id, name, color')
    .eq('team_id', teamId);

  const categoryRows = (categories ?? []) as Pick<
    ExpenseCategory,
    'id' | 'name' | 'color'
  >[];
  const categoryMeta = new Map(
    categoryRows.map((c) => [c.id, { name: c.name, color: c.color }]),
  );

  return computeDashboardBudgetSummary(budgets, entries, monthStart, categoryMeta);
}

export async function getAnalyticsBudgetData(teamId: string) {
  const monthStart = getMonthStart();
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const rangeStart = getMonthStart(sixMonthsAgo);

  const [budgets, entriesRes, categoriesRes] = await Promise.all([
    getTeamBudgets(teamId),
    supabase
      .from('lunch_entries')
      .select('team_id, amount, lunch_date, category_id')
      .eq('team_id', teamId)
      .gte('lunch_date', rangeStart),
    supabase.from('expense_categories').select('*').eq('team_id', teamId),
  ]);

  const entries = (entriesRes.data ?? []) as ExpenseRow[];
  const spendIndex = buildExpenseSpendIndex(entries);
  const categories = (categoriesRes.data ?? []) as ExpenseCategory[];
  const categoryMeta = new Map(
    categories.map((c) => [c.id, { name: c.name, color: c.color }]),
  );

  const currentUsages = computeAllBudgetUsages(
    budgets,
    entries,
    monthStart,
    categoryMeta,
  );

  const monthlyBudget = budgets.find(
    (b) => b.type === 'monthly' && (!b.month || b.month === monthStart),
  );

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(getMonthStart(d));
  }

  const comparison = months.map((m) => {
    const spent = getAggregatedSpent(spendIndex, teamId, null, m);
    const limit = monthlyBudget ? Number(monthlyBudget.amount) : 0;
    return {
      month: m,
      spent,
      budget: limit,
      label: new Date(m).toLocaleString('default', { month: 'short', year: '2-digit' }),
    };
  });

  const categoryBreakdown: BudgetWithUsage[] = computeAllBudgetUsages(
    budgets.filter((b) => b.type === 'category'),
    entries,
    monthStart,
    categoryMeta,
  );

  return {
    currentUsages,
    comparison,
    categoryBreakdown,
    hasMonthlyBudget: !!monthlyBudget,
  };
}
