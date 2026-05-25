import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import type { TeamMap } from '@/lib/seed/teams';
import { daysAgo, log, toIso } from '@/lib/seed/utils';

export async function seedDemoActivity(
  admin: SeedAdmin,
  users: UserMap,
  teams: TeamMap,
): Promise<void> {
  const teamIds = [...teams.values()].map((t) => t.id);
  await admin.from('team_activity_log').delete().in('team_id', teamIds);

  const owner = users.get('owner@expensea.app');
  const adminUser = users.get('admin@expensea.app');
  const viewer = users.get('viewer@expensea.app');
  const hq = teams.get('expensea-hq');
  const remote = teams.get('remote-team');
  const friends = teams.get('friends-trip');

  if (!owner || !hq) return;

  const rows: {
    team_id: string;
    user_id: string | null;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }[] = [
    {
      team_id: hq.id,
      user_id: owner,
      action: 'team_created',
      metadata: { name: 'Expensea HQ', seed: true },
      created_at: toIso(daysAgo(185)),
    },
    {
      team_id: hq.id,
      user_id: adminUser ?? owner,
      action: 'member_joined',
      metadata: { email: 'admin@expensea.app' },
      created_at: toIso(daysAgo(180)),
    },
    {
      team_id: hq.id,
      user_id: viewer ?? owner,
      action: 'member_joined',
      metadata: { email: 'viewer@expensea.app' },
      created_at: toIso(daysAgo(150)),
    },
    {
      team_id: hq.id,
      user_id: adminUser ?? owner,
      action: 'lunch_entry_created',
      metadata: { amount: 5000, shared: true, note: 'Team lunch' },
      created_at: toIso(daysAgo(3)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'settlement_completed',
      metadata: { amount: 3000, from: 'viewer@expensea.app' },
      created_at: toIso(daysAgo(5)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'budget_updated',
      metadata: { type: 'category', category: 'food', amount: 25000 },
      created_at: toIso(daysAgo(10)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'invitation_sent',
      metadata: { email: 'new.hire@expensea.app' },
      created_at: toIso(daysAgo(7)),
    },
    {
      team_id: hq.id,
      user_id: viewer ?? owner,
      action: 'invite_accepted',
      metadata: { team: 'Expensea HQ' },
      created_at: toIso(daysAgo(149)),
    },
  ];

  if (remote && adminUser) {
    rows.push({
      team_id: remote.id,
      user_id: adminUser,
      action: 'team_created',
      metadata: { name: 'Remote Team' },
      created_at: toIso(daysAgo(120)),
    });
  }

  if (friends) {
    const hamza = users.get('hamza.malik@expensea.app');
    rows.push(
      {
        team_id: friends.id,
        user_id: hamza ?? owner,
        action: 'team_created',
        metadata: { name: 'Friends Trip' },
        created_at: toIso(daysAgo(30)),
      },
      {
        team_id: friends.id,
        user_id: hamza ?? owner,
        action: 'lunch_entry_created',
        metadata: { amount: 12000, shared: true },
        created_at: toIso(daysAgo(2)),
      },
    );
  }

  for (const ctx of teams.values()) {
    for (let i = 0; i < 8; i++) {
      const actor = ctx.memberIds[i % ctx.memberIds.length];
      rows.push({
        team_id: ctx.id,
        user_id: actor,
        action: 'lunch_entry_created',
        metadata: {
          amount: 500 + Math.floor(Math.random() * 4000),
          shared: Math.random() < 0.3,
        },
        created_at: toIso(daysAgo(Math.floor(Math.random() * 60) + 1)),
      });
    }
  }

  const { error } = await admin.from('team_activity_log').insert(rows);
  if (error) throw new Error(`Activity: ${error.message}`);
  log('activity', `${rows.length} log entries`);
}
