import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import type { TeamMap } from '@/lib/seed/teams';
import {
  BUDGETS_BY_TEAM,
  type DemoTeamSlug,
} from '@/lib/seed/config';
import { log } from '@/lib/seed/utils';

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

    for (const cfg of configs) {
      inserts.push({
        team_id: ctx.id,
        type: 'monthly',
        category_id: null,
        amount: cfg.monthly,
        currency: ctx.currency,
        month: cfg.month ?? null,
        created_by: creator,
      });

      if (cfg.categories) {
        for (const [catSlug, cap] of Object.entries(cfg.categories)) {
          const categoryId = ctx.categories.get(catSlug);
          if (!categoryId || cap == null) continue;
          inserts.push({
            team_id: ctx.id,
            type: 'category',
            category_id: categoryId,
            amount: cap,
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
