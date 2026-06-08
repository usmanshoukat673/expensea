'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { settlementSchema } from '@/lib/validations';
import { notifyTeamMembers } from '@/lib/notifications';
import { recordActivity } from '@/lib/activity';

export type ActionResult = { error?: string; success?: boolean };

function revalidateSettlementSurfaces() {
  revalidatePath('/settlements');
  revalidatePath('/');
  revalidatePath('/analytics');
  revalidatePath('/notifications');
  revalidatePath('/activity');
}

function formatSettlementAmount(amount: number | string | null | undefined) {
  return `Rs ${Number(amount ?? 0).toLocaleString('en-PK')}`;
}

async function validateSettlementMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  payerUserId: string,
  receiverUserId: string,
) {
  const { data, error } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .in('user_id', [payerUserId, receiverUserId]);

  if (error) return error.message;

  const members = new Set((data ?? []).map((m) => m.user_id));
  if (!members.has(payerUserId) || !members.has(receiverUserId)) {
    return 'Settlement users must be active members of this team';
  }

  return null;
}

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
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please check the form and try again' };
  if (parsed.data.payerUserId === parsed.data.receiverUserId) {
    return { error: 'Payer and receiver must be different' };
  }

  const supabase = await createClient();
  const memberError = await validateSettlementMembers(
    supabase,
    session.teamId,
    parsed.data.payerUserId,
    parsed.data.receiverUserId,
  );
  if (memberError) return { error: memberError };

  const { data: settlement, error } = await supabase.from('settlements').insert({
    team_id: session.teamId,
    payer_user_id: parsed.data.payerUserId,
    receiver_user_id: parsed.data.receiverUserId,
    amount: parsed.data.amount,
    note: parsed.data.note ?? null,
    proof_url: parsed.data.proofUrl ?? null,
    status: 'pending',
    created_by: session.user.id,
  }).select('id').single();

  if (error) return { error: error.message };

  if (settlement) {
    await recordActivity(supabase, {
      teamId: session.teamId,
      userId: session.user.id,
      actionType: 'settlement_created',
      entityType: 'settlement',
      entityId: settlement.id,
      message: `Settlement created for ${formatSettlementAmount(parsed.data.amount)}`,
      metadata: {
        amount: parsed.data.amount,
        payer: parsed.data.payerUserId,
        receiver: parsed.data.receiverUserId,
      },
    });
  }

  await notifyTeamMembers({
    teamId: session.teamId,
    type: 'settlement_request',
    title: 'New settlement request',
    body: `A settlement of ${formatSettlementAmount(parsed.data.amount)} was recorded`,
    link: '/settlements',
    metadata: { settlementId: settlement?.id, payer: parsed.data.payerUserId, receiver: parsed.data.receiverUserId },
    memberIds: [parsed.data.receiverUserId, parsed.data.payerUserId],
    audience: 'personal',
  });

  revalidateSettlementSurfaces();
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
  if (existing.status !== 'pending') {
    return { error: 'Only pending settlements can be updated' };
  }

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
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: status === 'completed' ? 'settlement_completed' : 'settlement_cancelled',
    entityType: 'settlement',
    entityId: id,
    message: `Settlement ${status} for ${formatSettlementAmount(existing.amount)}`,
    metadata: { amount: existing.amount, status },
  });

  await notifyTeamMembers({
    teamId: session.teamId,
    type: status === 'completed' ? 'settlement_completed' : 'settlement_cancelled',
    title: status === 'completed' ? 'Settlement completed' : 'Settlement cancelled',
    body: `Settlement of ${formatSettlementAmount(existing.amount)} marked ${status}`,
    link: '/settlements',
    metadata: { settlementId: id, amount: existing.amount, status },
    memberIds: [existing.payer_user_id, existing.receiver_user_id],
    audience: 'personal',
  });

  revalidateSettlementSurfaces();
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
