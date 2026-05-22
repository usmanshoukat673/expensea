'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { lunchEntrySchema } from '@/lib/validations';

export type ActionResult = { error?: string; success?: boolean };

export async function createLunchEntry(formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot add entries' };

  const parsed = lunchEntrySchema.safeParse({
    userId: formData.get('userId'),
    amount: formData.get('amount'),
    lunchDate: formData.get('lunchDate'),
    notes: formData.get('notes') || undefined,
    paymentStatus: formData.get('paymentStatus'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const supabase = await createClient();
  const { error } = await supabase.from('lunch_entries').insert({
    team_id: session.teamId,
    user_id: parsed.data.userId,
    amount: parsed.data.amount,
    lunch_date: parsed.data.lunchDate,
    notes: parsed.data.notes ?? null,
    payment_status: parsed.data.paymentStatus,
    created_by: session.user.id,
  });

  if (error) return { error: error.message };

  await supabase.from('team_activity_log').insert({
    team_id: session.teamId,
    user_id: session.user.id,
    action: 'lunch_entry_created',
    metadata: { amount: parsed.data.amount },
  });

  revalidatePath('/');
  revalidatePath('/entries');
  return { success: true };
}

export async function updateLunchEntry(id: string, formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot edit entries' };

  const parsed = lunchEntrySchema.safeParse({
    userId: formData.get('userId'),
    amount: formData.get('amount'),
    lunchDate: formData.get('lunchDate'),
    notes: formData.get('notes') || undefined,
    paymentStatus: formData.get('paymentStatus'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('lunch_entries')
    .update({
      user_id: parsed.data.userId,
      amount: parsed.data.amount,
      lunch_date: parsed.data.lunchDate,
      notes: parsed.data.notes ?? null,
      payment_status: parsed.data.paymentStatus,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/entries');
  return { success: true };
}

export async function deleteLunchEntry(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot delete entries' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('lunch_entries')
    .delete()
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/entries');
  return { success: true };
}

export async function bulkDeleteLunchEntries(ids: string[]): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };
  if (!ids.length) return { error: 'No entries selected' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('lunch_entries')
    .delete()
    .in('id', ids)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/entries');
  return { success: true };
}
