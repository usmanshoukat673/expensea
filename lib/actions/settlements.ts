'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { settlementSchema } from '@/lib/validations';
import { notifyTeamMembers } from '@/lib/notifications';

export type ActionResult = { error?: string; success?: boolean };

export async function createSettlement(formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Permission denied' };

  const parsed = settlementSchema.safeParse({
    payerUserId: formData.get('payerUserId'),
    receiverUserId: formData.get('receiverUserId'),
    amount: formData.get('amount'),
    note: formData.get('note') || undefined,
    proofUrl: formData.get('proofUrl') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  if (parsed.data.payerUserId === parsed.data.receiverUserId) {
    return { error: 'Payer and receiver must be different' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('settlements').insert({
    team_id: session.teamId,
    payer_user_id: parsed.data.payerUserId,
    receiver_user_id: parsed.data.receiverUserId,
    amount: parsed.data.amount,
    note: parsed.data.note ?? null,
    proof_url: parsed.data.proofUrl ?? null,
    status: 'pending',
    created_by: session.user.id,
  });

  if (error) return { error: error.message };

  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'settlement_request',
    title: 'New settlement request',
    body: `A settlement of ${parsed.data.amount} was recorded`,
    metadata: { payer: parsed.data.payerUserId, receiver: parsed.data.receiverUserId },
    memberIds: [parsed.data.receiverUserId, parsed.data.payerUserId],
  });

  revalidatePath('/settlements');
  revalidatePath('/');
  return { success: true };
}

export async function updateSettlementStatus(
  id: string,
  status: 'completed' | 'cancelled',
): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('settlements')
    .select('*')
    .eq('id', id)
    .eq('team_id', session.teamId)
    .single();

  if (!existing) return { error: 'Settlement not found' };

  const isParty =
    existing.payer_user_id === session.user.id ||
    existing.receiver_user_id === session.user.id;
  if (!canEdit(session.role) && !isParty) return { error: 'Permission denied' };

  const { error } = await supabase
    .from('settlements')
    .update({
      status,
      settled_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  if (status === 'completed') {
    await notifyTeamMembers({
      teamId: session.teamId,
      excludeUserId: session.user.id,
      type: 'settlement_completed',
      title: 'Settlement completed',
      body: `Settlement of ${existing.amount} marked complete`,
      memberIds: [existing.payer_user_id, existing.receiver_user_id],
    });
  }

  revalidatePath('/settlements');
  revalidatePath('/');
  return { success: true };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) return { error: error.message };
  return { success: true };
}
