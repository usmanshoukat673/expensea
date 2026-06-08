import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import { DEMO_TEAMS, SEED_VERSION } from '@/lib/seed/config';
import { daysAgo, log, toIso } from '@/lib/seed/utils';

export type TeamContext = {
  id: string;
  slug: string;
  currency: string;
  memberIds: string[];
  categories: Map<string, string>;
};

export type TeamMap = Map<string, TeamContext>;

export async function seedDemoTeams(
  admin: SeedAdmin,
  users: UserMap,
): Promise<TeamMap> {
  const teams: TeamMap = new Map();

  for (const def of DEMO_TEAMS) {
    const ownerId = users.get(def.ownerEmail);
    if (!ownerId) throw new Error(`Owner not found: ${def.ownerEmail}`);

    const createdAt = toIso(daysAgo(def.createdDaysAgo));

    const { data: existing } = await admin
      .from('teams')
      .select('id')
      .eq('slug', def.slug)
      .maybeSingle();

    let teamId = existing?.id;

    if (teamId) {
      await admin
        .from('teams')
        .update({
          name: def.name,
          brand_name: def.brandName ?? def.name,
          owner_id: ownerId,
          created_by: ownerId,
          currency: def.currency,
          is_public: def.isPublic,
          show_balances_on_public: def.showBalancesOnPublic,
          show_category_analytics_on_public: def.showCategoryAnalyticsOnPublic,
          created_at: createdAt,
        })
        .eq('id', teamId);
    } else {
      const { data: inserted, error } = await admin
        .from('teams')
        .insert({
          name: def.name,
          slug: def.slug,
          owner_id: ownerId,
          created_by: ownerId,
          brand_name: def.brandName ?? def.name,
          currency: def.currency,
          is_public: def.isPublic,
          show_balances_on_public: def.showBalancesOnPublic,
          show_category_analytics_on_public: def.showCategoryAnalyticsOnPublic,
          created_at: createdAt,
        })
        .select('id')
        .single();

      if (error || !inserted) throw new Error(`Team ${def.slug}: ${error?.message}`);
      teamId = inserted.id;
    }

    await admin.from('team_members').delete().eq('team_id', teamId);

    const memberIds: string[] = [];
    for (const m of def.members) {
      const userId = users.get(m.email);
      if (!userId) continue;
      memberIds.push(userId);
      const joinedAt = toIso(daysAgo(def.createdDaysAgo + Math.floor(Math.random() * 14)));
      await admin.from('team_members').upsert(
        {
          team_id: teamId,
          user_id: userId,
          role: m.role,
          status: 'active',
          joined_at: joinedAt,
        },
        { onConflict: 'team_id,user_id' },
      );
    }

    const { data: cats } = await admin
      .from('expense_categories')
      .select('id, slug')
      .eq('team_id', teamId);

    const categories = new Map((cats ?? []).map((c) => [c.slug, c.id]));

    teams.set(def.slug, {
      id: teamId,
      slug: def.slug,
      currency: def.currency,
      memberIds,
      categories,
    });
  }

  const ownerId = users.get('owner@expensea.app');
  if (ownerId) {
    const hq = teams.get('expensea-hq');
    await admin
      .from('profiles')
      .update({ team_id: hq?.id ?? null, onboarding_completed: true })
      .eq('id', ownerId);
  }

  log('teams', `${teams.size} teams (${SEED_VERSION})`);
  return teams;
}

export async function seedPendingInvitations(
  admin: SeedAdmin,
  teams: TeamMap,
  users: UserMap,
): Promise<void> {
  const hq = teams.get('expensea-hq');
  const remote = teams.get('remote-team');
  const inviter = users.get('owner@expensea.app');
  if (!hq || !remote || !inviter) return;

  await admin.from('team_invitations').delete().in('team_id', [hq.id, remote.id]);
  await admin.from('team_invites').delete().in('team_id', [hq.id, remote.id]);

  await admin.from('team_invitations').insert([
    {
      team_id: hq.id,
      email: 'new.hire@expensea.app',
      role: 'viewer',
      invited_by: inviter,
      status: 'pending',
      expires_at: toIso(daysAgo(-5)),
    },
    {
      team_id: remote.id,
      email: 'contractor@expensea.app',
      role: 'admin',
      invited_by: inviter,
      status: 'pending',
      expires_at: toIso(daysAgo(-3)),
    },
  ]);

  await admin.from('team_invites').insert([
    {
      team_id: hq.id,
      invited_email: 'new.hire@expensea.app',
      role: 'viewer',
      created_by: inviter,
      usage_limit: 5,
      usage_count: 0,
      is_active: true,
      expires_at: toIso(daysAgo(-14)),
    },
    {
      team_id: remote.id,
      invited_email: null,
      role: 'admin',
      created_by: inviter,
      usage_limit: 2,
      usage_count: 1,
      is_active: true,
      expires_at: toIso(daysAgo(-10)),
    },
    {
      team_id: hq.id,
      invited_email: 'expired.invite@expensea.app',
      role: 'viewer',
      created_by: inviter,
      usage_limit: 1,
      usage_count: 0,
      is_active: true,
      expires_at: toIso(daysAgo(2)),
    },
  ]);

  log('invitations', 'pending and expired invite fixtures created');
}
