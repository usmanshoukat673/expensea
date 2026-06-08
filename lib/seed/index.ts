import { createSeedAdmin } from '@/lib/seed/client';
import { resetDemoData, isDemoSeeded } from '@/lib/seed/reset';
import { seedAuthValidationFixtures, seedDemoUsers } from '@/lib/seed/auth';
import { seedDemoTeams, seedPendingInvitations } from '@/lib/seed/teams';
import { seedDemoExpenses } from '@/lib/seed/expenses';
import { seedDemoSettlements } from '@/lib/seed/settlements';
import { seedDemoBudgets } from '@/lib/seed/budgets';
import { seedDemoRecurringExpenses } from '@/lib/seed/recurring-expenses';
import { seedDemoActivity } from '@/lib/seed/activity';
import { seedDemoNotifications } from '@/lib/seed/notifications';
import { seedDemoDashboardCustomization } from '@/lib/seed/dashboard-customization';
import { initFaker, log } from '@/lib/seed/utils';
import { DEMO_PASSWORD, DEMO_USERS } from '@/lib/seed/config';

export type SeedOptions = {
  reset?: boolean;
  force?: boolean;
  deleteUsers?: boolean;
};

export async function runSeed(opts: SeedOptions = {}): Promise<void> {
  initFaker();
  const admin = createSeedAdmin();

  if (opts.reset) {
    await resetDemoData(admin, { deleteUsers: opts.deleteUsers });
  } else if (!opts.force && (await isDemoSeeded(admin))) {
    const { count } = await admin
      .from('lunch_entries')
      .select('id', { count: 'exact', head: true })
      .in(
        'team_id',
        (
          await admin
            .from('teams')
            .select('id')
            .in('slug', [
              'expensea-hq',
              'remote-team',
              'family-budget',
              'startup-operations',
              'friends-trip',
            ])
        ).data?.map((t) => t.id) ?? [],
      );

    if ((count ?? 0) > 50) {
      console.log(
        '[seed] Demo data already present. Use --force or npm run db:reseed to replace.',
      );
      printCredentials();
      return;
    }
  }

  log('start', 'Expensea demo seed');

  const users = await seedDemoUsers(admin);
  await seedAuthValidationFixtures(admin);
  const teams = await seedDemoTeams(admin, users);
  await seedPendingInvitations(admin, teams, users);
  const { entryCount } = await seedDemoExpenses(admin, users, teams);
  await seedDemoSettlements(admin, users, teams);
  await seedDemoBudgets(admin, users, teams);
  await seedDemoRecurringExpenses(admin, users, teams);
  await seedDemoActivity(admin, users, teams);
  await seedDemoNotifications(admin, users, teams);
  await seedDemoDashboardCustomization(admin, users, teams);

  log('done', `${entryCount} expenses across ${teams.size} teams`);
  printCredentials();
}

function printCredentials(): void {
  console.log('\n--- Demo accounts (password: ' + DEMO_PASSWORD + ') ---');
  for (const u of DEMO_USERS) {
    console.log(`  ${u.email}  →  ${u.fullName}`);
  }
  console.log('\n  Primary login: owner@expensea.app');
  console.log('  Public team:   /share/expensea-hq\n');
}

export { resetDemoData } from '@/lib/seed/reset';
