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
  await admin.from('activity_logs').delete().in('team_id', teamIds);

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
      action: 'expense_created',
      metadata: { amount: 5000, entity_type: 'expense', message: 'Usman created Food Expense for Rs 5,000' },
      created_at: toIso(daysAgo(4)),
    },
    {
      team_id: hq.id,
      user_id: adminUser ?? owner,
      action: 'expense_submitted',
      metadata: { amount: 5000, shared: true, entity_type: 'expense', message: 'Ahmed submitted Food Expense for Rs 5,000' },
      created_at: toIso(daysAgo(3)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'expense_approved',
      metadata: { amount: 5000, entity_type: 'expense', message: 'Usman approved Food Expense for Rs 5,000' },
      created_at: toIso(daysAgo(2)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'expense_updated',
      metadata: { amount: 7800, entity_type: 'expense', message: 'Usman updated Office Expense to Rs 7,800' },
      created_at: toIso(daysAgo(2)),
    },
    {
      team_id: hq.id,
      user_id: adminUser ?? owner,
      action: 'expense_assigned',
      metadata: { amount: 7800, assigned_user_id: viewer ?? owner, entity_type: 'expense', message: 'Laptop repair assigned to Sarah' },
      created_at: toIso(daysAgo(2)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'expense_deleted',
      metadata: { amount: 1500, entity_type: 'expense', message: 'Usman deleted Miscellaneous Expense for Rs 1,500' },
      created_at: toIso(daysAgo(1)),
    },
    {
      team_id: hq.id,
      user_id: adminUser ?? owner,
      action: 'expense_rejected',
      metadata: { amount: 2400, reason: 'Missing receipt', entity_type: 'expense' },
      created_at: toIso(daysAgo(4)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'expense_reimbursed',
      metadata: { amount: 6400, reimbursement_status: 'fully_reimbursed', entity_type: 'expense' },
      created_at: toIso(daysAgo(1)),
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
      action: 'settlement_cancelled',
      metadata: { amount: 900, entity_type: 'settlement', message: 'Settlement cancelled for Rs 900' },
      created_at: toIso(daysAgo(6)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'budget_created',
      metadata: { type: 'category', category: 'food', amount: 25000, entity_type: 'budget' },
      created_at: toIso(daysAgo(10)),
    },
    {
      team_id: hq.id,
      user_id: owner,
      action: 'budget_deleted',
      metadata: { type: 'monthly', amount: 10000, entity_type: 'budget', message: 'Budget deleted for Rs 10,000' },
      created_at: toIso(daysAgo(8)),
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
  await admin.from('activity_logs').delete().in('team_id', teamIds);

  const normalizedRows = rows.map((row) => {
    const entityType = String(row.metadata.entity_type ?? (row.action.startsWith('expense') || row.action.startsWith('lunch') ? 'expense' : row.action.startsWith('budget') ? 'budget' : row.action.startsWith('settlement') ? 'settlement' : row.action.startsWith('invite') || row.action.startsWith('invitation') ? 'team' : row.action.startsWith('recurring') ? 'recurring_expense' : 'team'));
    const description = String(
      row.metadata.description ??
        row.metadata.message ??
        row.metadata.note ??
        row.action.replace(/_/g, ' '),
    );
    return {
      team_id: row.team_id,
      user_id: row.user_id,
      action_type: row.action,
      entity_type: entityType,
      entity_id: (row.metadata.entity_id as string | undefined) ?? null,
      message: description,
      description,
      metadata: row.metadata,
      created_at: row.created_at,
    };
  });

  const { error: normalizedError } = await admin.from('activity_logs').insert(normalizedRows);
  if (normalizedError) throw new Error(`Activity logs: ${normalizedError.message}`);
  log('activity', `${rows.length} legacy entries, ${normalizedRows.length} activity logs`);
}
