import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import type { TeamMap } from '@/lib/seed/teams';
import { daysAgo, log, toIso } from '@/lib/seed/utils';

export async function seedDemoNotifications(
  admin: SeedAdmin,
  users: UserMap,
  teams: TeamMap,
): Promise<void> {
  const emails = [...users.keys()];
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('email', emails);

  const userIds = (profiles ?? []).map((p) => p.id);
  await admin.from('notifications').delete().in('user_id', userIds);

  const owner = users.get('owner@expensea.app');
  const adminUser = users.get('admin@expensea.app');
  const viewer = users.get('viewer@expensea.app');
  const hq = teams.get('expensea-hq');
  const friends = teams.get('friends-trip');

  if (!hq || !owner) return;

  const rows: {
    user_id: string;
    team_id: string;
    type: string;
    title: string;
    body: string | null;
    metadata: Record<string, unknown>;
    read_at: string | null;
    created_at: string;
  }[] = [];

  if (adminUser) {
    rows.push({
      user_id: adminUser,
      team_id: hq.id,
      type: 'budget_warning',
      title: 'Food budget at 92%',
      body: 'Team food spending is approaching the monthly category limit.',
      metadata: { category: 'food', utilization: 92 },
      read_at: null,
      created_at: toIso(daysAgo(1)),
    });
  }

  if (viewer) {
    rows.push(
      {
        user_id: viewer,
        team_id: hq.id,
        type: 'shared_expense',
        title: 'New shared expense',
        body: 'Usman added a shared expense of Rs 5,000 — your share is Rs 1,000',
        metadata: { amount: 5000, share: 1000 },
        read_at: null,
        created_at: toIso(daysAgo(2)),
      },
      {
        user_id: viewer,
        team_id: hq.id,
        type: 'settlement_reminder',
        title: 'Settlement reminder',
        body: 'You have a pending balance of Rs 1,200 with Usman Shoukat',
        metadata: { amount: 1200 },
        read_at: toIso(daysAgo(0)),
        created_at: toIso(daysAgo(4)),
      },
    );
  }

  rows.push({
    user_id: owner,
    team_id: hq.id,
    type: 'team_invite',
    title: 'Team invite sent',
    body: 'Invitation sent to new.hire@expensea.app',
    metadata: { email: 'new.hire@expensea.app' },
    read_at: toIso(daysAgo(6)),
    created_at: toIso(daysAgo(7)),
  });

  if (adminUser) {
    rows.push({
      user_id: adminUser,
      team_id: hq.id,
      type: 'new_expense',
      title: 'New expense recorded',
      body: 'Ahmed Khan logged Office Supplies — Rs 4,200',
      metadata: {},
      read_at: null,
      created_at: toIso(daysAgo(0)),
    });
  }

  if (friends) {
    const hamza = users.get('hamza.malik@expensea.app');
    const bilal = users.get('bilal.hassan@expensea.app');
    if (hamza) {
      rows.push({
        user_id: hamza,
        team_id: friends.id,
        type: 'settlement_reminder',
        title: 'Pending settlement',
        body: 'Bilal owes you Rs 2,400 for trip fuel',
        metadata: { amount: 2400 },
        read_at: null,
        created_at: toIso(daysAgo(1)),
      });
    }
    if (bilal) {
      rows.push({
        user_id: bilal,
        team_id: friends.id,
        type: 'budget_warning',
        title: 'Travel budget exceeded',
        body: 'Friends Trip travel category is over budget this month.',
        metadata: { category: 'travel' },
        read_at: null,
        created_at: toIso(daysAgo(2)),
      });
    }
  }

  const { error } = await admin.from('notifications').insert(rows);
  if (error) throw new Error(`Notifications: ${error.message}`);
  log('notifications', `${rows.length} notifications`);
}
