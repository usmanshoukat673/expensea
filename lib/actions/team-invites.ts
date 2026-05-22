'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireTeam, canEdit } from '@/lib/auth/session';
import { persistActiveTeam } from '@/lib/auth/teams';
import { inviteSchema } from '@/lib/validations';
import type { TeamRole } from '@/lib/database.types';
import {
  expiresAtFromOption,
  buildTeamInviteUrl,
  type InviteExpiryOption,
} from '@/lib/invites/utils';

export type ActionResult<T = void> = { error?: string; success?: boolean; data?: T };

export type TeamInvitePreview = {
  valid: boolean;
  reason?: string | null;
  team_id?: string;
  team_name?: string;
  role?: TeamRole;
  invited_email?: string | null;
  expires_at?: string | null;
  inviter_name?: string;
};

export type TeamInviteRow = {
  id: string;
  token: string;
  team_id: string;
  invited_email: string | null;
  role: TeamRole;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

async function insertInvite(params: {
  teamId: string;
  userId: string;
  role: 'admin' | 'viewer';
  expiresAt: string | null;
  invitedEmail?: string | null;
  usageLimit?: number | null;
  deactivateLinkOnly?: boolean;
}) {
  const supabase = await createClient();

  if (params.deactivateLinkOnly) {
    await supabase
      .from('team_invites')
      .update({ is_active: false })
      .eq('team_id', params.teamId)
      .is('invited_email', null)
      .eq('is_active', true);
  }

  const { data, error } = await supabase
    .from('team_invites')
    .insert({
      team_id: params.teamId,
      role: params.role,
      expires_at: params.expiresAt,
      invited_email: params.invitedEmail ?? null,
      usage_limit: params.usageLimit ?? null,
      created_by: params.userId,
    })
    .select('id, token')
    .single();

  return { data, error };
}

export async function getInvitePreview(token: string): Promise<TeamInvitePreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_team_invite_preview', { p_token: token });
  if (error || !data) return null;
  return data as TeamInvitePreview;
}

export async function getActiveShareableInvite(): Promise<ActionResult<{ url: string; token: string }>> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data } = await supabase
    .from('team_invites')
    .select('token, expires_at, usage_limit, usage_count, is_active')
    .eq('team_id', session.teamId)
    .is('invited_email', null)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { success: true, data: { url: '', token: '' } };

  const now = new Date();
  const expired =
    !data.is_active ||
    (data.expires_at && new Date(data.expires_at) <= now) ||
    (data.usage_limit != null && data.usage_count >= data.usage_limit);

  if (expired) return { success: true, data: { url: '', token: '' } };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return {
    success: true,
    data: { token: data.token, url: buildTeamInviteUrl(baseUrl, data.token) },
  };
}

export async function generateShareableInvite(formData: FormData): Promise<
  ActionResult<{ url: string; token: string }>
> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'You do not have permission to create invites' };

  const role = (formData.get('role') as 'admin' | 'viewer') || 'viewer';
  const expiry = (formData.get('expiry') as InviteExpiryOption) || '7d';
  if (role !== 'admin' && role !== 'viewer') return { error: 'Invalid role' };

  const expiresAt = expiresAtFromOption(expiry);
  const supabase = await createClient();
  const { data, error } = await insertInvite({
    teamId: session.teamId,
    userId: session.user.id,
    role,
    expiresAt,
    invitedEmail: null,
    deactivateLinkOnly: true,
  });

  if (error || !data) return { error: error?.message ?? 'Failed to generate link' };

  await supabase.from('team_activity_log').insert({
    team_id: session.teamId,
    user_id: session.user.id,
    action: 'invite_link_generated',
    metadata: { role, expiry },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  revalidatePath('/team');
  revalidatePath('/settings/team');
  return {
    success: true,
    data: { token: data.token, url: buildTeamInviteUrl(baseUrl, data.token) },
  };
}

export async function sendEmailInvite(formData: FormData): Promise<ActionResult<{ token: string }>> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'You do not have permission to invite members' };

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const expiry = (formData.get('expiry') as InviteExpiryOption) || '7d';
  const expiresAt = expiresAtFromOption(expiry);
  const email = parsed.data.email.toLowerCase();

  const supabase = await createClient();
  const { data: existingMember } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingMember) {
    const { data: member } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', session.teamId)
      .eq('user_id', existingMember.id)
      .maybeSingle();
    if (member) return { error: 'This user is already on the team' };
  }

  const { data: pending } = await supabase
    .from('team_invites')
    .select('id')
    .eq('team_id', session.teamId)
    .eq('invited_email', email)
    .eq('is_active', true)
    .maybeSingle();

  if (pending) return { error: 'An active invitation already exists for this email' };

  const { data, error } = await insertInvite({
    teamId: session.teamId,
    userId: session.user.id,
    role: parsed.data.role,
    expiresAt,
    invitedEmail: email,
    usageLimit: 1,
  });

  if (error || !data) return { error: error?.message ?? 'Failed to send invitation' };

  await supabase.from('team_activity_log').insert({
    team_id: session.teamId,
    user_id: session.user.id,
    action: 'invitation_sent',
    metadata: { email, role: parsed.data.role },
  });

  revalidatePath('/team');
  return { success: true, data: { token: data.token } };
}

export async function acceptTeamInvite(token: string): Promise<ActionResult> {
  const session = await requireAuth();
  const trimmed = token.trim();
  if (!trimmed) return { error: 'Invalid invite link' };

  const supabase = await createClient();
  const { data: invite, error: fetchError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('token', trimmed)
    .single();

  if (fetchError || !invite) return { error: 'Invalid invite link' };

  const now = new Date();
  if (!invite.is_active) return { error: 'This invitation has been disabled' };
  if (invite.expires_at && new Date(invite.expires_at) <= now) {
    return { error: 'This invitation has expired' };
  }
  if (invite.usage_limit != null && invite.usage_count >= invite.usage_limit) {
    return { error: 'This invitation has reached its usage limit' };
  }

  if (
    invite.invited_email &&
    invite.invited_email.toLowerCase() !== session.user.email?.toLowerCase()
  ) {
    return { error: 'This invitation was sent to a different email address' };
  }

  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', invite.team_id)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existing) return { error: 'You are already a member of this team' };

  if (invite.role === 'owner') return { error: 'Invalid invitation role' };

  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: invite.team_id,
    user_id: session.user.id,
    role: invite.role,
  });
  if (memberError) return { error: memberError.message };

  await supabase
    .from('team_invites')
    .update({ usage_count: invite.usage_count + 1 })
    .eq('id', invite.id);

  if (invite.usage_limit != null && invite.usage_count + 1 >= invite.usage_limit) {
    await supabase.from('team_invites').update({ is_active: false }).eq('id', invite.id);
  }

  const { error: activeError } = await persistActiveTeam(supabase, session.user.id, invite.team_id);
  if (activeError) return { error: activeError };

  await supabase.from('team_activity_log').insert({
    team_id: invite.team_id,
    user_id: session.user.id,
    action: 'member_joined',
    metadata: { via: 'team_invite' },
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function disableTeamInvite(inviteId: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('team_invites')
    .update({ is_active: false })
    .eq('id', inviteId)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/team');
  return { success: true };
}

export async function regenerateTeamInvite(inviteId: string, formData: FormData): Promise<
  ActionResult<{ url: string; token: string }>
> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data: old } = await supabase
    .from('team_invites')
    .select('role, invited_email')
    .eq('id', inviteId)
    .eq('team_id', session.teamId)
    .single();

  if (!old) return { error: 'Invite not found' };

  await supabase.from('team_invites').update({ is_active: false }).eq('id', inviteId);

  const expiry = (formData.get('expiry') as InviteExpiryOption) || '7d';
  const role = (old.role === 'admin' || old.role === 'viewer' ? old.role : 'viewer') as
    | 'admin'
    | 'viewer';

  const { data, error } = await insertInvite({
    teamId: session.teamId,
    userId: session.user.id,
    role,
    expiresAt: expiresAtFromOption(expiry),
    invitedEmail: old.invited_email,
    usageLimit: old.invited_email ? 1 : null,
  });

  if (error || !data) return { error: error?.message ?? 'Failed to regenerate' };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  revalidatePath('/team');
  return {
    success: true,
    data: { token: data.token, url: buildTeamInviteUrl(baseUrl, data.token) },
  };
}

export async function listTeamInvites(): Promise<TeamInviteRow[]> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('team_invites')
    .select('*')
    .eq('team_id', session.teamId)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data ?? []) as TeamInviteRow[];
}
