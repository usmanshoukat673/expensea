import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import type { TeamMap } from '@/lib/seed/teams';
import { DEMO_TEAMS } from '@/lib/seed/config';
import { log, toIso, daysAgo } from '@/lib/seed/utils';
import { roleAwareWidgetOrder, toJson, type DashboardWidgetId } from '@/lib/dashboard-customization';

const VIEW_PRESETS: {
  name: string;
  widgets: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
  filters: Record<string, string>;
}[] = [
  {
    name: 'Finance Overview',
    widgets: ['summary', 'budget', 'monthly_overview', 'balance', 'categories', 'leaderboard', 'recent_entries', 'activity'],
    hidden: ['workflow'],
    filters: { dateRange: 'this_month', status: 'approved' },
  },
  {
    name: 'Budget Monitoring',
    widgets: ['budget', 'categories', 'monthly_overview', 'summary', 'activity', 'notifications'],
    hidden: ['workflow', 'recurring'],
    filters: { dateRange: 'this_month', budget: 'active' },
  },
  {
    name: 'Approvals Dashboard',
    widgets: ['workflow', 'notifications', 'activity', 'recent_entries', 'summary', 'budget'],
    hidden: ['leaderboard', 'recurring'],
    filters: { status: 'pending_approval', dateRange: 'last_30_days' },
  },
  {
    name: 'Personal Dashboard',
    widgets: ['summary', 'recent_entries', 'activity', 'quick_actions', 'monthly_overview', 'notifications'],
    hidden: ['workflow', 'leaderboard'],
    filters: { dateRange: 'this_month', status: 'personal' },
  },
];

export async function seedDemoDashboardCustomization(
  admin: SeedAdmin,
  users: UserMap,
  teams: TeamMap,
): Promise<void> {
  let preferenceCount = 0;
  let viewCount = 0;

  for (const teamDef of DEMO_TEAMS) {
    const team = teams.get(teamDef.slug);
    if (!team) continue;

    const memberRows = teamDef.members
      .map((member) => ({ ...member, userId: users.get(member.email) }))
      .filter((member): member is typeof member & { userId: string } => Boolean(member.userId));

    await admin.from('dashboard_favorites').delete().eq('team_id', team.id);
    await admin.from('user_dashboard_preferences').delete().eq('team_id', team.id);
    await admin.from('dashboard_saved_views').delete().eq('team_id', team.id);

    for (const member of memberRows) {
      const roleOrder = roleAwareWidgetOrder(member.role);
      const hidden =
        member.role === 'viewer'
          ? ['workflow', 'budget']
          : member.role === 'admin'
            ? ['leaderboard']
            : [];
      const pinned = member.role === 'owner' ? ['reports', 'dashboards'] : member.role === 'admin' ? ['categories'] : ['teams'];

      const { data: pref, error: prefError } = await admin
        .from('user_dashboard_preferences')
        .insert({
          user_id: member.userId,
          team_id: team.id,
          layout_json: toJson({ widgets: roleOrder }),
          hidden_widgets: toJson(hidden),
          pinned_widgets: toJson(pinned),
          created_at: toIso(daysAgo(12)),
          updated_at: toIso(daysAgo(2)),
        })
        .select('id')
        .single();
      if (prefError) throw new Error(`Dashboard preference seed failed: ${prefError.message}`);
      if (pref) preferenceCount += 1;

      const presets = member.role === 'owner' ? VIEW_PRESETS.slice(0, 3) : member.role === 'admin' ? VIEW_PRESETS.slice(1, 4) : VIEW_PRESETS.slice(2, 4);
      const insertedViewIds: string[] = [];
      for (const [index, preset] of presets.entries()) {
        const { data: view, error: viewError } = await admin
          .from('dashboard_saved_views')
          .insert({
            user_id: member.userId,
            team_id: team.id,
            name: preset.name,
            layout_json: toJson({ widgets: preset.widgets }),
            hidden_widgets: toJson(preset.hidden),
            pinned_widgets: toJson(pinned),
            filters_json: toJson({ ...preset.filters, team: team.slug }),
            is_default: index === 0,
            created_at: toIso(daysAgo(10 - index)),
            updated_at: toIso(daysAgo(index + 1)),
          })
          .select('id')
          .single();
        if (viewError) throw new Error(`Dashboard saved view seed failed: ${viewError.message}`);
        if (view?.id) {
          insertedViewIds.push(view.id);
          viewCount += 1;
        }
      }

      if (insertedViewIds[0]) {
        await admin
          .from('user_dashboard_preferences')
          .update({ default_view_id: insertedViewIds[0] })
          .eq('user_id', member.userId)
          .eq('team_id', team.id);
      }

      const firstCategoryId = team.categories.values().next().value as string | undefined;
      const { error: favoriteError } = await admin.from('dashboard_favorites').insert([
        {
          user_id: member.userId,
          team_id: team.id,
          favorite_type: 'dashboard',
          favorite_id: insertedViewIds[0] ?? null,
          label: `${teamDef.name} dashboard`,
          href: '/',
          metadata: { seed: true },
        },
        {
          user_id: member.userId,
          team_id: team.id,
          favorite_type: 'report',
          favorite_id: null,
          label: 'Monthly report',
          href: '/reports',
          metadata: { seed: true, dateRange: 'this_month' },
        },
        {
          user_id: member.userId,
          team_id: team.id,
          favorite_type: 'category',
          favorite_id: firstCategoryId ?? null,
          label: 'Priority category',
          href: '/categories',
          metadata: { seed: true },
        },
      ]);
      if (favoriteError) throw new Error(`Dashboard favorite seed failed: ${favoriteError.message}`);
    }
  }

  log('dashboard', `${preferenceCount} preferences, ${viewCount} saved views`);
}
