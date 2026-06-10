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
    message: string | null;
    link: string | null;
    metadata: Record<string, unknown>;
    is_read: boolean;
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
      message: 'Team food spending is approaching the monthly category limit.',
      link: '/budgets',
      metadata: { category: 'food', utilization: 92 },
      is_read: false,
      read_at: null,
      created_at: toIso(daysAgo(1)),
    });
    rows.push({
      user_id: adminUser,
      team_id: hq.id,
      type: 'new_expense',
      title: 'New expense created',
      body: 'Usman created Food Expense for PKR 5,000',
      message: 'Usman created Food Expense for PKR 5,000',
      link: '/entries',
      metadata: { event_type: 'new_expense', amount: 5000, categoryName: 'Food Expense' },
      is_read: false,
      read_at: null,
      created_at: toIso(daysAgo(0)),
    });
  }

  if (viewer) {
    rows.push(
      {
        user_id: viewer,
        team_id: hq.id,
        type: 'expense_assigned',
        title: 'Expense assigned to you',
        body: 'Usman assigned Office Expense to you for PKR 7,800',
        message: 'Usman assigned Office Expense to you for PKR 7,800',
        link: '/my-expenses',
        metadata: { event_type: 'expense_assigned', amount: 7800 },
        is_read: false,
        read_at: null,
        created_at: toIso(daysAgo(0)),
      },
      {
        user_id: viewer,
        team_id: hq.id,
        type: 'shared_expense',
        title: 'New shared expense',
        body: 'Usman added a shared expense of PKR 5,000 — your share is PKR 1,000',
        message: 'Usman added a shared expense of PKR 5,000 — your share is PKR 1,000',
        link: '/entries',
        metadata: { amount: 5000, share: 1000 },
        is_read: false,
        read_at: null,
        created_at: toIso(daysAgo(2)),
      },
      {
        user_id: viewer,
        team_id: hq.id,
        type: 'settlement_reminder',
        title: 'Settlement reminder',
        body: 'You have a pending balance of PKR 1,200 with Usman Shoukat',
        message: 'You have a pending balance of PKR 1,200 with Usman Shoukat',
        link: '/settlements',
        metadata: { amount: 1200 },
        is_read: true,
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
    message: 'Invitation sent to new.hire@expensea.app',
    link: '/team/invite',
    metadata: { email: 'new.hire@expensea.app' },
    is_read: true,
    read_at: toIso(daysAgo(6)),
    created_at: toIso(daysAgo(7)),
  });

  if (adminUser) {
    rows.push({
      user_id: adminUser,
      team_id: hq.id,
      type: 'expense_submitted',
      title: 'Expense submitted',
      body: 'Ahmed Khan submitted Office Supplies — PKR 4,200 for approval',
      message: 'Ahmed Khan submitted Office Supplies — PKR 4,200 for approval',
      link: '/approvals',
      metadata: { event_type: 'expense_submitted', amount: 4200 },
      is_read: false,
      read_at: null,
      created_at: toIso(daysAgo(0)),
    });
  }

  if (viewer) {
    rows.push(
      {
        user_id: viewer,
        team_id: hq.id,
        type: 'expense_approved',
        title: 'Expense approved',
        body: 'Your travel reimbursement claim was approved.',
        message: 'Your travel reimbursement claim was approved.',
        link: '/entries',
        metadata: { event_type: 'expense_approved', amount: 8500 },
        is_read: false,
        read_at: null,
        created_at: toIso(daysAgo(1)),
      },
      {
        user_id: viewer,
        team_id: hq.id,
        type: 'expense_rejected',
        title: 'Expense rejected',
        body: 'Missing receipt for the client lunch claim.',
        message: 'Missing receipt for the client lunch claim.',
        link: '/entries',
        metadata: { event_type: 'expense_rejected', reason: 'Missing receipt' },
        is_read: false,
        read_at: null,
        created_at: toIso(daysAgo(3)),
      },
      {
        user_id: viewer,
        team_id: hq.id,
        type: 'reimbursement_completed',
        title: 'Reimbursement completed',
        body: 'PKR 6,400 was reimbursed by payroll.',
        message: 'PKR 6,400 was reimbursed by payroll.',
        link: '/entries',
        metadata: { event_type: 'reimbursement_completed', amount: 6400 },
        is_read: true,
        read_at: toIso(daysAgo(0)),
        created_at: toIso(daysAgo(0)),
      },
    );
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
        body: 'Bilal owes you PKR 2,400 for trip fuel',
        message: 'Bilal owes you PKR 2,400 for trip fuel',
        link: '/settlements',
        metadata: { amount: 2400 },
        is_read: false,
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
        message: 'Friends Trip travel category is over budget this month.',
        link: '/budgets',
        metadata: { category: 'travel' },
        is_read: false,
        read_at: null,
        created_at: toIso(daysAgo(2)),
      });
    }
  }

  const { error } = await admin.from('notifications').insert(rows);
  if (error) throw new Error(`Notifications: ${error.message}`);
  log('notifications', `${rows.length} notifications`);
}
