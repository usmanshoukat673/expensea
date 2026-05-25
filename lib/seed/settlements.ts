import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import type { TeamMap } from '@/lib/seed/teams';
import { daysAgo, log, toIso } from '@/lib/seed/utils';

export async function seedDemoSettlements(
  admin: SeedAdmin,
  users: UserMap,
  teams: TeamMap,
): Promise<void> {
  const hq = teams.get('expensea-hq');
  const friends = teams.get('friends-trip');
  const owner = users.get('owner@expensea.app');
  const adminUser = users.get('admin@expensea.app');
  const viewer = users.get('viewer@expensea.app');
  const ahmed = users.get('ahmed.khan@expensea.app');
  const hamza = users.get('hamza.malik@expensea.app');
  const bilal = users.get('bilal.hassan@expensea.app');

  if (!hq || !owner || !adminUser) return;

  await admin.from('settlements').delete().eq('team_id', hq.id);
  if (friends) await admin.from('settlements').delete().eq('team_id', friends.id);

  type SettlementRow = {
    team_id: string;
    payer_user_id: string;
    receiver_user_id: string;
    amount: number;
    status: 'pending' | 'completed' | 'cancelled';
    note: string;
    created_by: string;
    created_at: string;
    settled_at?: string;
  };

  const rows: SettlementRow[] = [
    {
      team_id: hq.id,
      payer_user_id: adminUser,
      receiver_user_id: owner,
      amount: 1200,
      status: 'pending',
      note: 'Ali owes Usman for team lunch split',
      created_by: owner,
      created_at: toIso(daysAgo(2)),
    },
  ];

  if (viewer) {
    rows.push({
      team_id: hq.id,
      payer_user_id: viewer,
      receiver_user_id: owner,
      amount: 3000,
      status: 'completed',
      note: 'Sarah settled lunch dues',
      settled_at: toIso(daysAgo(5)),
      created_by: adminUser,
      created_at: toIso(daysAgo(8)),
    });
  }
  if (ahmed) {
    rows.push({
      team_id: hq.id,
      payer_user_id: ahmed,
      receiver_user_id: adminUser,
      amount: 850,
      status: 'completed',
      note: 'Travel share reimbursement',
      settled_at: toIso(daysAgo(12)),
      created_by: owner,
      created_at: toIso(daysAgo(15)),
    });
  }
  if (hamza) {
    rows.push({
      team_id: hq.id,
      payer_user_id: hamza,
      receiver_user_id: owner,
      amount: 450,
      status: 'cancelled',
      note: 'Duplicate entry — cancelled',
      created_by: owner,
      created_at: toIso(daysAgo(20)),
    });
  }

  if (friends && hamza && bilal && viewer) {
    rows.push(
      {
        team_id: friends.id,
        payer_user_id: bilal,
        receiver_user_id: hamza,
        amount: 2400,
        status: 'pending' as const,
        note: 'Trip fuel share',
        created_by: hamza,
        created_at: toIso(daysAgo(1)),
      },
      {
        team_id: friends.id,
        payer_user_id: viewer,
        receiver_user_id: hamza,
        amount: 1800,
        status: 'completed' as const,
        note: 'Hotel split settled',
        settled_at: toIso(daysAgo(4)),
        created_by: hamza,
        created_at: toIso(daysAgo(7)),
      },
    );
  }

  const { error } = await admin.from('settlements').insert(rows);
  if (error) throw new Error(`Settlements: ${error.message}`);
  log('settlements', `${rows.length} records`);
}
