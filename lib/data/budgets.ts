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

const FINANCIAL_APPROVAL_STATUSES = ['approved', 'reimbursed'] as const;

async function fetchMonthEntries(teamId: string, monthStart: string) {
  const supabase = await createClient();
  const monthEnd = getMonthEnd(monthStart);

  const { data } = await supabase
    .from('lunch_entries')
    .select('team_id, amount, lunch_date, category_id')
    .eq('team_id', teamId)
    .in('approval_status', FINANCIAL_APPROVAL_STATUSES)
    .gte('lunch_date', monthStart)
    .lte('lunch_date', monthEnd);

  return (data ?? []) as ExpenseRow[];
}

async function fetchRangeEntries(teamId: string, from: string, to: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('lunch_entries')
    .select('team_id, amount, lunch_date, category_id')
    .eq('team_id', teamId)
    .in('approval_status', FINANCIAL_APPROVAL_STATUSES)
    .gte('lunch_date', from)
    .lte('lunch_date', to);

  return (data ?? []) as ExpenseRow[];
}

export async function getTeamBudgets(teamId: string): Promise<TeamBudget[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('team_budgets')
    .select('*')
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
      .select('*')
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
  monthStartOverride?: string,
): Promise<DashboardBudgetSummary> {
  const monthStart = monthStartOverride ?? getMonthStart();
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

export async function getAnalyticsBudgetData(
  teamId: string,
  range?: { from: string; to: string },
) {
  const monthStart = getMonthStart();
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const rangeStart = range?.from ? getMonthStart(new Date(range.from)) : getMonthStart(sixMonthsAgo);

  const [budgets, entriesRes, categoriesRes] = await Promise.all([
    getTeamBudgets(teamId),
    supabase
      .from('lunch_entries')
      .select('team_id, amount, lunch_date, category_id')
      .eq('team_id', teamId)
      .in('approval_status', FINANCIAL_APPROVAL_STATUSES)
      .gte('lunch_date', rangeStart)
      .lte('lunch_date', range?.to ?? getMonthEnd(monthStart)),
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

  const monthlyBudgets = budgets.filter((b) => b.type === 'monthly');
  const currentMonthlyBudget = monthlyBudgets.find(
    (b) => b.month === monthStart,
  ) ?? monthlyBudgets.find((b) => !b.month);

  const months: string[] = [];
  if (range?.from && range?.to) {
    const cursor = new Date(`${getMonthStart(new Date(range.from))}T00:00:00`);
    const end = new Date(`${getMonthStart(new Date(range.to))}T00:00:00`);
    while (cursor <= end && months.length < 24) {
      months.push(getMonthStart(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(getMonthStart(d));
    }
  }

  const comparison = months.map((m) => {
    const spent = getAggregatedSpent(spendIndex, teamId, null, m);
    const monthlyBudget =
      monthlyBudgets.find((b) => b.month === m) ??
      monthlyBudgets.find((b) => !b.month);
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
    hasMonthlyBudget: !!currentMonthlyBudget,
  };
}

export async function getHistoricalBudgetData(teamId: string, from: string, to: string) {
  const supabase = await createClient();

  const [budgets, entries, categoriesRes] = await Promise.all([
    getTeamBudgets(teamId),
    fetchRangeEntries(teamId, from, to),
    supabase.from('expense_categories').select('*').eq('team_id', teamId),
  ]);

  const categories = (categoriesRes.data ?? []) as ExpenseCategory[];
  const categoryMeta = new Map(
    categories.map((c) => [c.id, { name: c.name, color: c.color }]),
  );
  const spendIndex = buildExpenseSpendIndex(entries);
  const months = [...new Set(entries.map((e) => getMonthStart(new Date(e.lunch_date))))].sort();

  return months.map((month) => {
    const usages = computeAllBudgetUsages(budgets, entries, month, categoryMeta);
    const monthly = usages.find((u) => u.type === 'monthly');
    const totalBudget = monthly
      ? Number(monthly.amount)
      : usages.filter((u) => u.type === 'category').reduce((sum, u) => sum + Number(u.amount), 0);
    const spent = getAggregatedSpent(spendIndex, teamId, null, month);
    return {
      month,
      spent,
      budget: totalBudget,
      overspent: Math.max(0, spent - totalBudget),
      utilization: totalBudget > 0 ? Math.round((spent / totalBudget) * 1000) / 10 : 0,
      exceeded: totalBudget > 0 && spent > totalBudget,
      categoryUsages: usages.filter((u) => u.type === 'category'),
    };
  });
}
