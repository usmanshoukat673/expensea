import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import type { TeamMap } from '@/lib/seed/teams';
import {
  BUDGETS_BY_TEAM,
  type DemoTeamSlug,
} from '@/lib/seed/config';
import { log, monthStart } from '@/lib/seed/utils';

const FINANCIAL_APPROVAL_STATUSES = ['approved', 'reimbursed'] as const;

export async function seedDemoBudgets(
  admin: SeedAdmin,
  users: UserMap,
  teams: TeamMap,
): Promise<void> {
  const teamIds = [...teams.values()].map((t) => t.id);
  await admin.from('team_budgets').delete().in('team_id', teamIds);

  const inserts: {
    team_id: string;
    type: 'monthly' | 'category';
    category_id: string | null;
    amount: number;
    currency: string;
    month: string | null;
    created_by: string;
  }[] = [];
  const currentMonth = monthStart(new Date());
  const currentMonthEnd = new Date();
  currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1, 0);
  const monthEnd = currentMonthEnd.toISOString().slice(0, 10);

  for (const [slug, configs] of Object.entries(BUDGETS_BY_TEAM) as [
    DemoTeamSlug,
    (typeof BUDGETS_BY_TEAM)[DemoTeamSlug],
  ][]) {
    const ctx = teams.get(slug);
    const creator = users.get(
      slug === 'expensea-hq'
        ? 'owner@expensea.app'
        : slug === 'remote-team'
          ? 'admin@expensea.app'
          : slug === 'family-budget'
            ? 'fatima.noor@expensea.app'
            : slug === 'startup-operations'
              ? 'ahmed.khan@expensea.app'
              : 'hamza.malik@expensea.app',
    );
    if (!ctx || !creator) continue;

    const spend = await getCurrentSpend(admin, ctx.id, currentMonth, monthEnd);

    for (const cfg of configs) {
      const monthlyAmount =
        cfg.month == null ? demoMonthlyBudgetAmount(slug, cfg.monthly, spend.total) : cfg.monthly;

      inserts.push({
        team_id: ctx.id,
        type: 'monthly',
        category_id: null,
        amount: monthlyAmount,
        currency: ctx.currency,
        month: cfg.month ?? null,
        created_by: creator,
      });

      if (cfg.categories) {
        for (const [catSlug, cap] of Object.entries(cfg.categories)) {
          const categoryId = ctx.categories.get(catSlug);
          if (!categoryId || cap == null) continue;
          const amount =
            cfg.month == null
              ? demoCategoryBudgetAmount(slug, catSlug, cap, spend.byCategory.get(categoryId) ?? 0)
              : cap;
          inserts.push({
            team_id: ctx.id,
            type: 'category',
            category_id: categoryId,
            amount,
            currency: ctx.currency,
            month: cfg.month ?? null,
            created_by: creator,
          });
        }
      }
    }
  }

  const { error } = await admin.from('team_budgets').insert(inserts);
  if (error) throw new Error(`Budgets: ${error.message}`);
  log('budgets', `${inserts.length} budget rows`);
}

async function getCurrentSpend(
  admin: SeedAdmin,
  teamId: string,
  from: string,
  to: string,
): Promise<{ total: number; byCategory: Map<string, number> }> {
  const { data, error } = await admin
    .from('lunch_entries')
    .select('amount, category_id')
    .eq('team_id', teamId)
    .in('approval_status', FINANCIAL_APPROVAL_STATUSES)
    .gte('lunch_date', from)
    .lte('lunch_date', to);

  if (error) throw new Error(`Budget spend lookup: ${error.message}`);

  const byCategory = new Map<string, number>();
  let total = 0;
  for (const row of data ?? []) {
    const amount = Number(row.amount);
    total += amount;
    if (row.category_id) {
      byCategory.set(row.category_id, (byCategory.get(row.category_id) ?? 0) + amount);
    }
  }

  return { total, byCategory };
}

function demoMonthlyBudgetAmount(slug: DemoTeamSlug, fallback: number, spent: number): number {
  if (spent <= 0) return fallback;
  if (slug === 'expensea-hq') return Math.max(fallback, Math.ceil(spent / 0.55));
  if (slug === 'startup-operations') return Math.max(1000, Math.ceil(spent * 0.82));
  if (slug === 'friends-trip') return Math.max(1000, Math.ceil(spent / 0.88));
  return fallback;
}

function demoCategoryBudgetAmount(
  slug: DemoTeamSlug,
  categorySlug: string,
  fallback: number,
  spent: number,
): number {
  if (spent <= 0) return fallback;
  if (slug === 'expensea-hq' && categorySlug === 'food') {
    return Math.max(1000, Math.ceil(spent / 0.9));
  }
  if (slug === 'friends-trip' && categorySlug === 'travel') {
    return Math.max(1000, Math.ceil(spent * 0.75));
  }
  return fallback;
}
