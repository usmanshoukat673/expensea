import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile, TeamRole } from '@/lib/database.types';
import type { SessionContext } from '@/lib/auth/session';
import { listUserTeams, resolveActiveTeam, persistActiveTeam } from '@/lib/auth/teams';

type Supabase = SupabaseClient<Database>;

export type WorkspaceState = {
  profile: Profile | null;
  teamId: string | null;
  role: TeamRole | null;
  ready: boolean;
  hasMembership: boolean;
};

export async function resolveWorkspace(
  supabase: Supabase,
  userId: string
): Promise<WorkspaceState> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return { profile: null, teamId: null, role: null, ready: false, hasMembership: false };
  }

  const teams = await listUserTeams(supabase, userId);
  const hasMembership = teams.length > 0;

  if (!hasMembership) {
    if (profile.team_id) {
      const { data: repaired } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', userId)
        .select('*')
        .maybeSingle();
      return {
        profile: repaired ?? profile,
        teamId: null,
        role: null,
        ready: false,
        hasMembership: false,
      };
    }
    return { profile, teamId: null, role: null, ready: false, hasMembership: false };
  }

  let { teamId, role } = await resolveActiveTeam(supabase, userId, profile.team_id);

  if (teamId && profile.team_id !== teamId) {
    await persistActiveTeam(supabase, userId, teamId);
    const { data: refreshed } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (refreshed) {
      return buildState(refreshed, teamId, role, hasMembership);
    }
  }

  return buildState(profile, teamId, role, hasMembership);
}

function buildState(
  profile: Profile,
  teamId: string | null,
  role: TeamRole | null,
  hasMembership: boolean
): WorkspaceState {
  const ready = Boolean(
    profile.onboarding_completed && hasMembership && teamId && role
  );
  return { profile, teamId, role, ready, hasMembership };
}

export function sessionHasWorkspace(session: SessionContext): boolean {
  return Boolean(
    session.profile.onboarding_completed && session.teamId && session.role
  );
}

export async function isWorkspaceReady(supabase: Supabase, userId: string): Promise<boolean> {
  const { ready } = await resolveWorkspace(supabase, userId);
  return ready;
}
