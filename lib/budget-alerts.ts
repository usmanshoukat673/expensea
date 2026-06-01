import { notifyTeamMembers } from '@/lib/activity';
import {
  computeAllBudgetUsages,
  getMonthEnd,
  getMonthStart,
} from '@/lib/budget/engine';
import type { createClient } from '@/lib/supabase/server';

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export async function notifyBudgetThresholds(
  supabase: SupabaseServer,
  opts: { teamId: string; actorId: string; excludeUserId?: string },
) {
  const monthStart = getMonthStart();
  const monthEnd = getMonthEnd(monthStart);
  const [budgetsRes, entriesRes, categoriesRes, recentRes] = await Promise.all([
    supabase.from('team_budgets').select('*').eq('team_id', opts.teamId),
    supabase
      .from('lunch_entries')
      .select('team_id, amount, lunch_date, category_id')
      .eq('team_id', opts.teamId)
      .gte('lunch_date', monthStart)
      .lte('lunch_date', monthEnd),
    supabase.from('expense_categories').select('id, name, color').eq('team_id', opts.teamId),
    supabase
      .from('notifications')
      .select('metadata')
      .eq('team_id', opts.teamId)
      .gte('created_at', monthStart)
      .in('type', ['warning', 'error'])
      .limit(100),
  ]);

  const categoryMeta = new Map(
    (categoriesRes.data ?? []).map((c) => [c.id, { name: c.name, color: c.color }]),
  );
  const sent = new Set(
    (recentRes.data ?? []).map((n) => {
      const metadata = n.metadata as Record<string, unknown>;
      return `${metadata.budgetId}:${metadata.alertLevel}`;
    }),
  );

  const usages = computeAllBudgetUsages(
    budgetsRes.data ?? [],
    entriesRes.data ?? [],
    monthStart,
    categoryMeta,
  );

  for (const usage of usages) {
    if (usage.alertLevel === 'none') continue;
    const key = `${usage.id}:${usage.alertLevel}`;
    if (sent.has(key)) continue;

    const label =
      usage.type === 'category'
        ? `${usage.categoryName ?? 'Category'} budget`
        : 'Team monthly budget';
    const exceeded = usage.alertLevel === 'exceeded';

    await notifyTeamMembers({
      supabase,
      teamId: opts.teamId,
      excludeUserId: opts.excludeUserId,
      type: exceeded ? 'error' : 'warning',
      title: exceeded ? `${label} exceeded` : `${label} at 80%`,
      message: `${label} is at ${usage.utilization}% usage for this month.`,
      metadata: {
        event_type: exceeded ? 'budget_exceeded' : 'budget_warning_80',
        budgetId: usage.id,
        alertLevel: usage.alertLevel,
        spent: usage.spent,
        limit: Number(usage.amount),
      },
    });
  }
}
