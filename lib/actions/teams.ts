'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireTeam, canEdit, isOwner } from '@/lib/auth/session';
import { clearActiveTeamIfRemoved, persistActiveTeam } from '@/lib/auth/teams';
import { teamNameSchema } from '@/lib/validations';
import { normalizeCurrencyCode, type CurrencyCode } from '@/lib/currency';
import type { TeamRole } from '@/lib/database.types';

export type ActionResult<T = void> = { error?: string; success?: boolean; data?: T };

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'team';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function completeOnboarding(formData: FormData): Promise<ActionResult> {
  const session = await requireAuth();
  const fullName = String(formData.get('fullName') ?? '').trim();
  if (fullName.length < 2) return { error: 'Name is required' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', session.user.id);
  if (error) return { error: error.message };
  revalidatePath('/onboarding');
  return { success: true };
}

export async function createTeam(formData: FormData): Promise<ActionResult<{ teamId: string }>> {
  const session = await requireAuth();
  const parsed = teamNameSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid name' };

  const supabase = await createClient();
  const slug = slugify(parsed.data.name);

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name: parsed.data.name,
      slug,
      owner_id: session.user.id,
      created_by: session.user.id,
      currency: 'PKR',
    })
    .select()
    .single();

  if (teamError || !team) return { error: teamError?.message ?? 'Failed to create team' };

  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: team.id,
    user_id: session.user.id,
    role: 'owner',
  });
  if (memberError) return { error: memberError.message };

  const { error: activeError } = await persistActiveTeam(supabase, session.user.id, team.id);
  if (activeError) return { error: activeError };

  await supabase.from('team_activity_log').insert({
    team_id: team.id,
    user_id: session.user.id,
    action: 'team_created',
    metadata: { name: team.name },
  });

  revalidatePath('/', 'layout');
  return { success: true, data: { teamId: team.id } };
}

export async function joinTeamByToken(formData: FormData): Promise<ActionResult> {
  const token = String(formData.get('token') ?? '').trim();
  if (!token) return { error: 'Invitation token is required' };

  const { acceptTeamInvite } = await import('@/lib/actions/team-invites');
  const result = await acceptTeamInvite(token);
  if (result.success) return result;

  const session = await requireAuth();
  const supabase = await createClient();
  const { data: invite, error: inviteError } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (inviteError || !invite) return { error: result.error ?? 'Invalid or expired invitation' };

  if (invite.email.toLowerCase() !== session.user.email?.toLowerCase()) {
    return { error: 'This invitation was sent to a different email address' };
  }

  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: invite.team_id,
    user_id: session.user.id,
    role: invite.role,
  });
  if (memberError) return { error: memberError.message };

  await supabase.from('team_invitations').update({ status: 'accepted' }).eq('id', invite.id);
  const { error: activeError } = await persistActiveTeam(supabase, session.user.id, invite.team_id);
  if (activeError) return { error: activeError };

  await supabase.from('team_activity_log').insert({
    team_id: invite.team_id,
    user_id: session.user.id,
    action: 'member_joined',
    metadata: { via: 'invitation' },
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  const { sendEmailInvite } = await import('@/lib/actions/team-invites');
  return sendEmailInvite(formData);
}

export async function updateMemberRole(memberId: string, role: TeamRole): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };
  if (role === 'owner' && !isOwner(session.role)) {
    return { error: 'Only the owner can assign owner role' };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('team_id', session.teamId)
    .single();

  if (!member) return { error: 'Member not found' };
  if (member.role === 'owner') return { error: 'Cannot change owner role directly' };

  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('id', memberId);

  if (error) return { error: error.message };
  revalidatePath('/team');
  return { success: true };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data: member } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('team_id', session.teamId)
    .single();

  if (!member) return { error: 'Member not found' };
  if (member.role === 'owner') return { error: 'Cannot remove the team owner' };

  const { error } = await supabase.from('team_members').delete().eq('id', memberId);
  if (error) return { error: error.message };

  await clearActiveTeamIfRemoved(supabase, member.user_id, session.teamId);

  revalidatePath('/team');
  return { success: true };
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const { disableTeamInvite } = await import('@/lib/actions/team-invites');
  const result = await disableTeamInvite(invitationId);
  if (result.success) return result;

  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('team_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/team');
  return { success: true };
}

export async function transferOwnership(newOwnerMemberId: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!isOwner(session.role)) return { error: 'Only the owner can transfer ownership' };

  const supabase = await createClient();
  const { data: newOwner } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('id', newOwnerMemberId)
    .eq('team_id', session.teamId)
    .single();

  if (!newOwner) return { error: 'Member not found' };

  await supabase.from('team_members').update({ role: 'admin' }).eq('team_id', session.teamId).eq('user_id', session.user.id);
  await supabase.from('team_members').update({ role: 'owner' }).eq('id', newOwnerMemberId);
  await supabase.from('teams').update({ owner_id: newOwner.user_id }).eq('id', session.teamId);

  revalidatePath('/team');
  return { success: true };
}

export async function updateTeamCurrency(currency: CurrencyCode): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const code = normalizeCurrencyCode(currency);
  const supabase = await createClient();
  const { error } = await supabase.from('teams').update({ currency: code }).eq('id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  revalidatePath('/settings/profile');
  revalidatePath('/settings/team');
  return { success: true };
}

export async function updateTeamSettings(formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const name = String(formData.get('name') ?? '').trim();
  const isPublic = formData.get('isPublic') === 'on';
  const showBalancesOnPublic = formData.get('showBalancesOnPublic') === 'on';
  const showCategoryAnalyticsOnPublic = formData.get('showCategoryAnalyticsOnPublic') === 'on';
  const currency = normalizeCurrencyCode(String(formData.get('currency') ?? 'PKR'));
  const brandName = String(formData.get('brandName') ?? '').trim() || null;
  if (name.length < 2) return { error: 'Team name is required' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('teams')
    .update({
      name,
      is_public: isPublic,
      currency,
      brand_name: brandName,
      show_balances_on_public: showBalancesOnPublic,
      show_category_analytics_on_public: showCategoryAnalyticsOnPublic,
    })
    .eq('id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  revalidatePath('/settings/team');
  revalidatePath('/settings/profile');
  revalidatePath('/team/settings');
  return { success: true };
}

export async function addMemberByEmail(formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = (formData.get('role') as TeamRole) || 'viewer';
  if (!email) return { error: 'Email is required' };
  if (role === 'owner') return { error: 'Cannot assign owner via manual add' };

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  if (!admin) return { error: 'Service role key required for manual member add' };

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile) return { error: 'No account found for this email. Send an invitation instead.' };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', session.teamId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) return { error: 'User is already a team member' };

  const { error } = await supabase.from('team_members').insert({
    team_id: session.teamId,
    user_id: profile.id,
    role,
  });
  if (error) return { error: error.message };

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', profile.id)
    .maybeSingle();

  if (!targetProfile?.team_id) {
    await persistActiveTeam(supabase, profile.id, session.teamId);
  }

  await supabase.from('team_activity_log').insert({
    team_id: session.teamId,
    user_id: session.user.id,
    action: 'member_added_manually',
    metadata: { email, role },
  });

  revalidatePath('/team');
  return { success: true };
}

export async function toggleMemberStatus(userId: string, active: boolean): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const supabase = await createClient();
  const status = active ? 'active' : 'suspended';
  const { error } = await supabase
    .from('team_members')
    .update({ status })
    .eq('user_id', userId)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/team');
  return { success: true };
}

export async function deleteTeam(): Promise<ActionResult> {
  const session = await requireTeam();
  if (!isOwner(session.role)) return { error: 'Only the owner can delete the workspace' };

  const supabase = await createClient();

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', session.teamId);

  for (const m of members ?? []) {
    await clearActiveTeamIfRemoved(supabase, m.user_id, session.teamId);
  }

  const { error } = await supabase.from('teams').delete().eq('id', session.teamId);
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: true };
}
