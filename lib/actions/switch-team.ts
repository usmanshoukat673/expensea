'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { listUserTeams, persistActiveTeam } from '@/lib/auth/teams';

export type ActionResult<T = void> = { error?: string; success?: boolean; data?: T };

export async function switchTeam(teamId: string): Promise<ActionResult<{ teamId: string }>> {
  const session = await requireAuth();
  const trimmed = teamId.trim();
  if (!trimmed) return { error: 'Team is required' };

  const supabase = await createClient();
  const teams = await listUserTeams(supabase, session.user.id);
  if (!teams.some((t) => t.id === trimmed)) {
    return { error: 'You do not have access to this team' };
  }

  const { error } = await persistActiveTeam(supabase, session.user.id, trimmed);
  if (error) return { error };

  revalidatePath('/', 'layout');
  return { success: true, data: { teamId: trimmed } };
}

export async function getUserTeamsForSwitcher() {
  const session = await requireAuth();
  const supabase = await createClient();
  const teams = await listUserTeams(supabase, session.user.id);
  return {
    teams,
    activeTeamId: session.profile.team_id,
  };
}
