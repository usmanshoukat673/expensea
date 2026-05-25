import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TeamRole } from '@/lib/database.types';

type Supabase = SupabaseClient<Database>;

export type UserTeam = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: TeamRole;
  currency?: string;
};

const ACTIVE_TEAM_STORAGE_KEY = 'expensea:active-team-id';

export function getActiveTeamStorageKey() {
  return ACTIVE_TEAM_STORAGE_KEY;
}

export async function listUserTeams(
  supabase: Supabase,
  userId: string
): Promise<UserTeam[]> {
  const { data: memberships } = await supabase
    .from('team_members')
    .select('role, teams(id, name, slug, logo_url, currency)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  if (!memberships?.length) return [];

  return memberships
    .map((m): UserTeam | null => {
      const raw = m.teams as unknown as
        | {
            id: string;
            name: string;
            slug: string;
            logo_url: string | null;
            currency?: string;
          }
        | {
            id: string;
            name: string;
            slug: string;
            logo_url: string | null;
            currency?: string;
          }[]
        | null;
      const team = Array.isArray(raw) ? raw[0] : raw;
      if (!team) return null;
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        logo_url: team.logo_url,
        role: m.role as TeamRole,
        currency: team.currency,
      };
    })
    .filter((t): t is UserTeam => t !== null);
}

export async function resolveActiveTeam(
  supabase: Supabase,
  userId: string,
  preferredTeamId?: string | null
): Promise<{ teamId: string | null; role: TeamRole | null }> {
  const teams = await listUserTeams(supabase, userId);
  if (!teams.length) return { teamId: null, role: null };

  const pick = (id: string | null | undefined) => {
    if (!id) return null;
    const found = teams.find((t) => t.id === id);
    return found ? { teamId: found.id, role: found.role } : null;
  };

  const fromPreferred = pick(preferredTeamId);
  if (fromPreferred) return fromPreferred;

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', userId)
    .maybeSingle();

  const fromProfile = pick(profile?.team_id);
  if (fromProfile) return fromProfile;

  const first = teams[0];
  return { teamId: first.id, role: first.role };
}

export async function persistActiveTeam(
  supabase: Supabase,
  userId: string,
  teamId: string
): Promise<{ error?: string }> {
  const { teamId: resolved, role } = await resolveActiveTeam(supabase, userId, teamId);
  if (!resolved || !role) return { error: 'You are not a member of this team' };

  const { error } = await supabase
    .from('profiles')
    .update({ team_id: resolved, onboarding_completed: true })
    .eq('id', userId);

  if (error) return { error: error.message };
  return {};
}

export async function clearActiveTeamIfRemoved(
  supabase: Supabase,
  userId: string,
  removedTeamId: string
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.team_id !== removedTeamId) return;

  const { teamId } = await resolveActiveTeam(supabase, userId, null);
  await supabase
    .from('profiles')
    .update({
      team_id: teamId,
      onboarding_completed: Boolean(teamId),
    })
    .eq('id', userId);
}
