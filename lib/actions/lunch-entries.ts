'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { lunchEntrySchema } from '@/lib/validations';
import { notifyTeamMembers } from '@/lib/notifications';

export type ActionResult = { error?: string; success?: boolean };

function parseParticipants(formData: FormData): string[] {
  const raw = formData.get('participantIds');
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function syncParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entryId: string,
  participantIds: string[],
  amount: number,
  splitType: 'equal' | 'selected' | 'none',
) {
  await supabase.from('lunch_entry_participants').delete().eq('entry_id', entryId);
  if (!participantIds.length || splitType === 'none') return;

  const share =
    splitType === 'equal' ? amount / participantIds.length : null;

  await supabase.from('lunch_entry_participants').insert(
    participantIds.map((userId) => ({
      entry_id: entryId,
      user_id: userId,
      share_amount: share,
    })),
  );
}

async function validateEntryTeamRefs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  userId: string,
  categoryId: string | null | undefined,
  participantIds: string[],
) {
  const userIds = [...new Set([userId, ...participantIds])];
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .in('user_id', userIds);

  if (membersError) return membersError.message;

  const memberSet = new Set((members ?? []).map((m) => m.user_id));
  if (!memberSet.has(userId)) return 'Selected payer is not an active team member';
  if (participantIds.some((id) => !memberSet.has(id))) {
    return 'All participants must be active members of this team';
  }

  if (categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (categoryError) return categoryError.message;
    if (!category) return 'Selected category does not belong to this team';
  }

  return null;
}

export async function createLunchEntry(formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot add entries' };

  const participantIds = parseParticipants(formData);
  const parsed = lunchEntrySchema.safeParse({
    userId: formData.get('userId'),
    amount: formData.get('amount'),
    lunchDate: formData.get('lunchDate'),
    notes: formData.get('notes') || undefined,
    paymentStatus: formData.get('paymentStatus'),
    categoryId: formData.get('categoryId') || null,
    isShared: formData.get('isShared') === 'true',
    splitType: formData.get('splitType') || 'none',
    participantIds,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const isShared = parsed.data.isShared ?? false;
  const splitType = isShared ? (parsed.data.splitType ?? 'equal') : 'none';
  const participants =
    isShared && participantIds.length
      ? participantIds
      : isShared
        ? [parsed.data.userId]
        : [];

  const supabase = await createClient();
  const refError = await validateEntryTeamRefs(
    supabase,
    session.teamId,
    parsed.data.userId,
    parsed.data.categoryId,
    participants,
  );
  if (refError) return { error: refError };

  const { data: row, error } = await supabase
    .from('lunch_entries')
    .insert({
      team_id: session.teamId,
      user_id: parsed.data.userId,
      amount: parsed.data.amount,
      lunch_date: parsed.data.lunchDate,
      notes: parsed.data.notes ?? null,
      payment_status: parsed.data.paymentStatus,
      category_id: parsed.data.categoryId ?? null,
      is_shared: isShared,
      split_type: splitType,
      created_by: session.user.id,
    })
    .select('id')
    .single();

  if (error || !row) return { error: error?.message ?? 'Failed to create entry' };

  if (isShared && participants.length) {
    const ids = participants.includes(parsed.data.userId)
      ? participants
      : [parsed.data.userId, ...participants];
    await syncParticipants(supabase, row.id, ids, parsed.data.amount, splitType);
  }

  await supabase.from('team_activity_log').insert({
    team_id: session.teamId,
    user_id: session.user.id,
    action: 'lunch_entry_created',
    metadata: { amount: parsed.data.amount, shared: isShared },
  });

  if (isShared) {
    await notifyTeamMembers({
      teamId: session.teamId,
      excludeUserId: session.user.id,
      type: 'shared_expense',
      title: 'New shared expense',
      body: `A shared expense of ${parsed.data.amount} was added`,
      metadata: { entryId: row.id },
    });
  }

  revalidatePath('/');
  revalidatePath('/entries');
  revalidatePath('/settlements');
  revalidatePath('/analytics');
  revalidatePath('/budgets');
  return { success: true };
}

export async function updateLunchEntry(id: string, formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot edit entries' };

  const participantIds = parseParticipants(formData);
  const parsed = lunchEntrySchema.safeParse({
    userId: formData.get('userId'),
    amount: formData.get('amount'),
    lunchDate: formData.get('lunchDate'),
    notes: formData.get('notes') || undefined,
    paymentStatus: formData.get('paymentStatus'),
    categoryId: formData.get('categoryId') || null,
    isShared: formData.get('isShared') === 'true',
    splitType: formData.get('splitType') || 'none',
    participantIds,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const isShared = parsed.data.isShared ?? false;
  const splitType = isShared ? (parsed.data.splitType ?? 'equal') : 'none';

  const supabase = await createClient();
  const participants =
    isShared && participantIds.length > 0
      ? participantIds.includes(parsed.data.userId)
        ? participantIds
        : [parsed.data.userId, ...participantIds]
      : isShared
        ? [parsed.data.userId]
        : [];
  const refError = await validateEntryTeamRefs(
    supabase,
    session.teamId,
    parsed.data.userId,
    parsed.data.categoryId,
    participants,
  );
  if (refError) return { error: refError };

  const { error } = await supabase
    .from('lunch_entries')
    .update({
      user_id: parsed.data.userId,
      amount: parsed.data.amount,
      lunch_date: parsed.data.lunchDate,
      notes: parsed.data.notes ?? null,
      payment_status: parsed.data.paymentStatus,
      category_id: parsed.data.categoryId ?? null,
      is_shared: isShared,
      split_type: splitType,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };

  if (isShared) {
    await syncParticipants(supabase, id, participants, parsed.data.amount, splitType);
  } else {
    await supabase.from('lunch_entry_participants').delete().eq('entry_id', id);
  }

  revalidatePath('/');
  revalidatePath('/entries');
  revalidatePath('/settlements');
  revalidatePath('/analytics');
  revalidatePath('/budgets');
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
  revalidatePath('/settlements');
  revalidatePath('/analytics');
  revalidatePath('/budgets');
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
  revalidatePath('/');
  revalidatePath('/entries');
  revalidatePath('/settlements');
  revalidatePath('/analytics');
  revalidatePath('/budgets');
  return { success: true };
}
