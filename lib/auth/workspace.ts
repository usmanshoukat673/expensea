import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile, TeamRole } from '@/lib/database.types';
import type { SessionContext } from '@/lib/auth/session';

type Supabase = SupabaseClient<Database>;

export type WorkspaceState = {
  profile: Profile | null;
  teamId: string | null;
  role: TeamRole | null;
  ready: boolean;
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
    return { profile: null, teamId: null, role: null, ready: false };
  }

  let role: TeamRole | null = null;
  let currentProfile = profile;

  if (profile.team_id) {
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', profile.team_id)
      .eq('user_id', userId)
      .maybeSingle();

    role = member?.role ?? null;

    if (!role) {
      const { data: repaired } = await supabase
        .from('profiles')
        .update({ team_id: null, onboarding_completed: false })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (repaired) {
        currentProfile = repaired;
      }
      role = null;
    }
  }

  const teamId = currentProfile.team_id;
  const ready = Boolean(
    currentProfile.onboarding_completed && teamId && role
  );

  return { profile: currentProfile, teamId, role, ready };
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
