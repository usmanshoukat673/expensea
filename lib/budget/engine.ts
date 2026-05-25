import type { BudgetType, TeamBudget } from '@/lib/database.types';

export type BudgetStatus = 'safe' | 'warning' | 'over';

export type BudgetAlertLevel = 'none' | 'warning80' | 'exceeded';

export type ExpenseRow = {
  team_id: string;
  amount: number;
  lunch_date: string;
  category_id?: string | null;
};

export type BudgetWithUsage = TeamBudget & {
  spent: number;
  remaining: number;
  utilization: number;
  overspent: number;
  status: BudgetStatus;
  alertLevel: BudgetAlertLevel;
  categoryName?: string | null;
  categoryColor?: string | null;
};

export type DashboardBudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  utilization: number;
  status: BudgetStatus;
  alertLevel: BudgetAlertLevel;
  hasBudget: boolean;
  budgets: BudgetWithUsage[];
};

export function getMonthStart(date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

export function getMonthEnd(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
}

export function monthKeyFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  return getMonthStart(d);
}

function spendKey(
  teamId: string,
  categoryId: string | null,
  monthStart: string,
): string {
  return `${teamId}:${categoryId ?? 'all'}:${monthStart}`;
}

export function buildExpenseSpendIndex(entries: ExpenseRow[]): Map<string, number> {
  const index = new Map<string, number>();

  for (const entry of entries) {
    const monthStart = monthKeyFromDate(entry.lunch_date);
    const amount = Number(entry.amount);
    const teamMonthKey = spendKey(entry.team_id, null, monthStart);
    index.set(teamMonthKey, (index.get(teamMonthKey) ?? 0) + amount);

    if (entry.category_id) {
      const categoryMonthKey = spendKey(
        entry.team_id,
        entry.category_id,
        monthStart,
      );
      index.set(categoryMonthKey, (index.get(categoryMonthKey) ?? 0) + amount);
    }
  }

  return index;
}

export function getAggregatedSpent(
  spendIndex: Map<string, number>,
  teamId: string,
  categoryId: string | null,
  monthStart: string,
): number {
  return spendIndex.get(spendKey(teamId, categoryId, monthStart)) ?? 0;
}

export function budgetAppliesToMonth(budget: TeamBudget, monthStart: string): boolean {
  if (!budget.month) return true;
  return budget.month === monthStart;
}

export function getUtilization(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((spent / limit) * 1000) / 10;
}

export function getBudgetStatus(utilization: number): BudgetStatus {
  if (utilization >= 100) return 'over';
  if (utilization >= 70) return 'warning';
  return 'safe';
}

export function getBudgetAlertLevel(utilization: number): BudgetAlertLevel {
  if (utilization >= 100) return 'exceeded';
  if (utilization >= 80) return 'warning80';
  return 'none';
}

export function computeBudgetUsage(
  budget: TeamBudget,
  spendIndex: Map<string, number>,
  monthStart: string,
  categoryMeta?: Map<string, { name: string; color: string }>,
): BudgetWithUsage {
  const spent =
    budget.type === 'category'
      ? getAggregatedSpent(
          spendIndex,
          budget.team_id,
          budget.category_id,
          monthStart,
        )
      : getAggregatedSpent(spendIndex, budget.team_id, null, monthStart);

  const limit = Number(budget.amount);
  const remaining = Math.max(0, limit - spent);
  const overspent = Math.max(0, spent - limit);
  const utilization = getUtilization(spent, limit);
  const status = getBudgetStatus(utilization);
  const alertLevel = getBudgetAlertLevel(utilization);

  const cat = budget.category_id
    ? categoryMeta?.get(budget.category_id)
    : undefined;

  return {
    ...budget,
    spent,
    remaining,
    utilization,
    overspent,
    status,
    alertLevel,
    categoryName: cat?.name ?? null,
    categoryColor: cat?.color ?? null,
  };
}

export function computeAllBudgetUsages(
  budgets: TeamBudget[],
  entries: ExpenseRow[],
  monthStart: string,
  categoryMeta?: Map<string, { name: string; color: string }>,
): BudgetWithUsage[] {
  const spendIndex = buildExpenseSpendIndex(entries);
  return budgets
    .filter((b) => budgetAppliesToMonth(b, monthStart))
    .map((b) => computeBudgetUsage(b, spendIndex, monthStart, categoryMeta));
}

export function computeDashboardBudgetSummary(
  budgets: TeamBudget[],
  entries: ExpenseRow[],
  monthStart: string,
  categoryMeta?: Map<string, { name: string; color: string }>,
): DashboardBudgetSummary {
  const usages = computeAllBudgetUsages(budgets, entries, monthStart, categoryMeta);
  const monthly = usages.find((u) => u.type === 'monthly');

  if (monthly) {
    return {
      totalBudget: Number(monthly.amount),
      totalSpent: monthly.spent,
      remaining: monthly.remaining,
      utilization: monthly.utilization,
      status: monthly.status,
      alertLevel: monthly.alertLevel,
      hasBudget: true,
      budgets: usages,
    };
  }

  const categoryBudgets = usages.filter((u) => u.type === 'category');
  const totalBudget = categoryBudgets.reduce((s, u) => s + Number(u.amount), 0);
  const totalSpent = categoryBudgets.reduce((s, u) => s + u.spent, 0);
  const remaining = Math.max(0, totalBudget - totalSpent);
  const utilization = getUtilization(totalSpent, totalBudget);

  return {
    totalBudget,
    totalSpent,
    remaining,
    utilization,
    status: getBudgetStatus(utilization),
    alertLevel: getBudgetAlertLevel(utilization),
    hasBudget: categoryBudgets.length > 0,
    budgets: usages,
  };
}

export function statusProgressColor(status: BudgetStatus): string {
  switch (status) {
    case 'over':
      return 'bg-destructive';
    case 'warning':
      return 'bg-amber-500';
    default:
      return 'bg-green-600 dark:bg-green-500';
  }
}

export function statusBadgeVariant(
  status: BudgetStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'over':
      return 'destructive';
    case 'warning':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function budgetTypeLabel(type: BudgetType): string {
  return type === 'monthly' ? 'Monthly team' : 'Category';
}

export function budgetStatusLabel(status: BudgetStatus): string {
  switch (status) {
    case 'over':
      return 'Over budget';
    case 'warning':
      return 'Warning';
    default:
      return 'On track';
  }
}
