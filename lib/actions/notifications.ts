'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam } from '@/lib/auth/session';

export type ActionResult = { error?: string; success?: boolean };

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), read: true, is_read: true })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/notifications');
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), read: true, is_read: true })
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId)
    .eq('is_read', false)
    .is('archived_at', null);

  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/notifications');
  return { success: true };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/notifications');
  return { success: true };
}

export async function bulkUpdateNotifications(
  ids: string[],
  action: 'read' | 'archive' | 'delete',
): Promise<ActionResult> {
  const session = await requireTeam();
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (!uniqueIds.length) return { error: 'Select at least one notification.' };

  const supabase = await createClient();
  const base = supabase
    .from('notifications')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId)
    .in('id', uniqueIds);

  const { data: owned, error: ownershipError } = await base;
  if (ownershipError) return { error: ownershipError.message };
  const ownedIds = (owned ?? []).map((row) => row.id);
  if (!ownedIds.length) return { error: 'No matching notifications found.' };

  const now = new Date().toISOString();
  let error;
  if (action === 'delete') {
    ({ error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', session.user.id)
      .eq('team_id', session.teamId)
      .in('id', ownedIds));
  } else {
    const patch =
      action === 'archive'
        ? { archived_at: now, is_read: true, read: true, read_at: now }
        : { is_read: true, read: true, read_at: now };
    ({ error } = await supabase
      .from('notifications')
      .update(patch)
      .eq('user_id', session.user.id)
      .eq('team_id', session.teamId)
      .in('id', ownedIds));
  }

  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/notifications');
  return { success: true };
}
