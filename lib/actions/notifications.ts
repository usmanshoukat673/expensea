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
    .update({ read_at: new Date().toISOString(), read: true })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), read: true })
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId)
    .is('read_at', null);

  if (error) return { error: error.message };
  revalidatePath('/');
  return { success: true };
}
