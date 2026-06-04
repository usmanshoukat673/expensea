import type { SeedAdmin } from '@/lib/seed/client';
import { DEMO_TEAM_SLUGS, DEMO_USERS } from '@/lib/seed/config';
import { log } from '@/lib/seed/utils';

export async function resetDemoData(
  admin: SeedAdmin,
  opts: { deleteUsers?: boolean } = {},
): Promise<void> {
  const { data: teams } = await admin
    .from('teams')
    .select('id, slug')
    .in('slug', [...DEMO_TEAM_SLUGS]);

  const teamIds = (teams ?? []).map((t) => t.id);
  if (!teamIds.length) {
    log('reset', 'no demo teams found');
    if (opts.deleteUsers) await deleteDemoAuthUsers(admin);
    return;
  }

  log('reset', `removing data for ${teamIds.length} demo teams`);

  const { data: entries } = await admin
    .from('lunch_entries')
    .select('id')
    .in('team_id', teamIds);
  const entryIds = (entries ?? []).map((e) => e.id);

  if (entryIds.length) {
    await admin.from('lunch_entry_participants').delete().in('entry_id', entryIds);
  }

  await admin.from('notifications').delete().in('team_id', teamIds);
  await admin.from('dashboard_favorites').delete().in('team_id', teamIds);
  await admin.from('user_dashboard_preferences').delete().in('team_id', teamIds);
  await admin.from('dashboard_saved_views').delete().in('team_id', teamIds);
  await admin.from('settlements').delete().in('team_id', teamIds);
  await admin.from('recurring_expenses').delete().in('team_id', teamIds);
  await admin.from('lunch_entries').delete().in('team_id', teamIds);
  await admin.from('team_budgets').delete().in('team_id', teamIds);
  await admin.from('activity_logs').delete().in('team_id', teamIds);
  await admin.from('team_activity_log').delete().in('team_id', teamIds);
  await admin.from('monthly_summaries').delete().in('team_id', teamIds);
  await admin.from('team_invites').delete().in('team_id', teamIds);
  await admin.from('team_invitations').delete().in('team_id', teamIds);
  await admin.from('team_members').delete().in('team_id', teamIds);
  await admin.from('expense_categories').delete().in('team_id', teamIds);
  await admin.from('teams').delete().in('id', teamIds);

  const emails = DEMO_USERS.map((u) => u.email);
  await admin
    .from('profiles')
    .update({ team_id: null, onboarding_completed: false })
    .in('email', emails);

  if (opts.deleteUsers) await deleteDemoAuthUsers(admin);

  log('reset', 'demo data cleared');
}

async function deleteDemoAuthUsers(admin: SeedAdmin): Promise<void> {
  for (const { email } of DEMO_USERS) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (profile?.id) {
      await admin.auth.admin.deleteUser(profile.id);
      log('reset', `deleted auth user ${email}`);
    }
  }
}

export async function isDemoSeeded(admin: SeedAdmin): Promise<boolean> {
  const { count } = await admin
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .in('slug', [...DEMO_TEAM_SLUGS]);
  return (count ?? 0) > 0;
}
