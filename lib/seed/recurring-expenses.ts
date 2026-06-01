import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import type { TeamMap } from '@/lib/seed/teams';
import { daysAgo, log, toDateString, toIso } from '@/lib/seed/utils';

type RecurringRow = {
  team_id: string;
  created_by: string;
  title: string;
  amount: number;
  category_id: string;
  frequency: 'monthly';
  interval_value: number;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  is_active: boolean;
  last_generated_at: string | null;
  created_at: string;
};

export async function seedDemoRecurringExpenses(
  admin: SeedAdmin,
  users: UserMap,
  teams: TeamMap,
): Promise<void> {
  const teamIds = [...teams.values()].map((t) => t.id);
  await admin.from('recurring_expenses').delete().in('team_id', teamIds);

  const rows: RecurringRow[] = [];

  add(rows, teams, users, {
    teamSlug: 'expensea-hq',
    creatorEmail: 'owner@expensea.app',
    title: 'Monthly office internet',
    amount: 8500,
    categorySlug: 'internet',
    startDaysAgo: 160,
    nextRunDaysFromNow: 4,
    active: true,
  });

  add(rows, teams, users, {
    teamSlug: 'expensea-hq',
    creatorEmail: 'owner@expensea.app',
    title: 'Office rent',
    amount: 55000,
    categorySlug: 'office',
    startDaysAgo: 150,
    nextRunDaysFromNow: 1,
    active: true,
  });

  add(rows, teams, users, {
    teamSlug: 'remote-team',
    creatorEmail: 'admin@expensea.app',
    title: 'Software subscriptions',
    amount: 320,
    categorySlug: 'office',
    startDaysAgo: 90,
    nextRunDaysFromNow: 8,
    active: true,
  });

  add(rows, teams, users, {
    teamSlug: 'startup-operations',
    creatorEmail: 'ahmed.khan@expensea.app',
    title: 'Design tools subscription',
    amount: 14500,
    categorySlug: 'office',
    startDaysAgo: 45,
    nextRunDaysFromNow: 18,
    active: false,
  });

  add(rows, teams, users, {
    teamSlug: 'friends-trip',
    creatorEmail: 'hamza.malik@expensea.app',
    title: 'Trip planning app trial',
    amount: 1200,
    categorySlug: 'entertainment',
    startDaysAgo: 28,
    endDaysAgo: 3,
    nextRunDaysFromNow: -2,
    active: false,
  });

  if (!rows.length) return;

  const { error } = await admin.from('recurring_expenses').insert(rows);
  if (error) throw new Error(`Recurring expenses: ${error.message}`);
  log('recurring', `${rows.length} rules`);
}

function add(
  rows: RecurringRow[],
  teams: TeamMap,
  users: UserMap,
  opts: {
    teamSlug: string;
    creatorEmail: string;
    title: string;
    amount: number;
    categorySlug: string;
    startDaysAgo: number;
    nextRunDaysFromNow: number;
    endDaysAgo?: number;
    active: boolean;
  },
) {
  const team = teams.get(opts.teamSlug);
  const creator = users.get(opts.creatorEmail);
  const category = team?.categories.get(opts.categorySlug);
  if (!team || !creator || !category) return;

  rows.push({
    team_id: team.id,
    created_by: creator,
    title: opts.title,
    amount: opts.amount,
    category_id: category,
    frequency: 'monthly',
    interval_value: 1,
    start_date: toDateString(daysAgo(opts.startDaysAgo)),
    end_date: opts.endDaysAgo == null ? null : toDateString(daysAgo(opts.endDaysAgo)),
    next_run_date: toDateString(daysAgo(-opts.nextRunDaysFromNow)),
    is_active: opts.active,
    last_generated_at: opts.active ? toIso(daysAgo(24)) : null,
    created_at: toIso(daysAgo(opts.startDaysAgo)),
  });
}
