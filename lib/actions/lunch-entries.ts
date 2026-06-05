'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { lunchEntrySchema, rejectionSchema, reimbursementSchema } from '@/lib/validations';
import { notifyTeamMembers } from '@/lib/notifications';
import { recordActivity } from '@/lib/activity';
import { notifyBudgetThresholds } from '@/lib/budget-alerts';

export type ActionResult = { error?: string; success?: boolean };

function revalidateExpenseSurfaces() {
  revalidatePath('/');
  revalidatePath('/entries');
  revalidatePath('/my-expenses');
  revalidatePath('/members');
  revalidatePath('/approvals');
  revalidatePath('/settlements');
  revalidatePath('/analytics');
  revalidatePath('/reports');
  revalidatePath('/budgets');
}

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
  assignedUserId?: string | null,
) {
  const userIds = [...new Set([userId, ...participantIds, assignedUserId].filter(Boolean) as string[])];
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

  const participantIds = parseParticipants(formData);
  const intent = formData.get('intent') === 'submit' ? 'submit' : 'draft';
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
    assignmentType: formData.get('assignmentType') || 'team',
    assignedUserId: formData.get('assignedUserId') || null,
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
    parsed.data.assignedUserId,
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
      assignment_type: parsed.data.assignmentType ?? 'team',
      assigned_user_id: parsed.data.assignmentType === 'individual' ? parsed.data.assignedUserId : null,
      assigned_by: parsed.data.assignmentType === 'individual' ? session.user.id : null,
      is_shared: isShared,
      split_type: splitType,
      created_by: session.user.id,
      approval_status: intent === 'submit' ? 'pending_approval' : 'draft',
      submitted_by: intent === 'submit' ? session.user.id : null,
      approved_by: null,
      approved_at: null,
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

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: intent === 'submit' ? 'expense_submitted' : 'expense_created',
    entityType: 'expense',
    entityId: row.id,
    message: intent === 'submit'
      ? `Expense submitted for approval (${parsed.data.amount})`
      : `Expense created for ${parsed.data.amount}`,
    metadata: {
      amount: parsed.data.amount,
      shared: isShared,
      approval_status: intent === 'submit' ? 'pending_approval' : 'draft',
      assignment_type: parsed.data.assignmentType ?? 'team',
      assigned_user_id: parsed.data.assignmentType === 'individual' ? parsed.data.assignedUserId : null,
    },
  });

  if (parsed.data.assignmentType === 'individual' && parsed.data.assignedUserId) {
    await recordActivity(supabase, {
      teamId: session.teamId,
      userId: session.user.id,
      actionType: 'expense_assigned',
      entityType: 'expense',
      entityId: row.id,
      message: `Expense assigned (${parsed.data.amount})`,
      metadata: { amount: parsed.data.amount, assigned_user_id: parsed.data.assignedUserId },
    });
  }

  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: intent === 'submit' ? 'expense_submitted' : 'new_expense',
    title: intent === 'submit' ? 'Expense submitted' : 'New expense added',
    body: intent === 'submit'
      ? `An expense of ${parsed.data.amount} is waiting for approval`
      : `An expense of ${parsed.data.amount} was added`,
    metadata: { entryId: row.id },
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

  if (intent !== 'submit') {
    await notifyBudgetThresholds(supabase, {
      teamId: session.teamId,
      actorId: session.user.id,
      excludeUserId: session.user.id,
    });
  }

  revalidateExpenseSurfaces();
  return { success: true };
}

export async function updateLunchEntry(id: string, formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();

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
    assignmentType: formData.get('assignmentType') || 'team',
    assignedUserId: formData.get('assignedUserId') || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };

  const isShared = parsed.data.isShared ?? false;
  const splitType = isShared ? (parsed.data.splitType ?? 'equal') : 'none';

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('lunch_entries')
    .select('created_by, approval_status')
    .eq('id', id)
    .eq('team_id', session.teamId)
    .maybeSingle();

  const canUpdateOwnDraft =
    existing?.created_by === session.user.id &&
    ['draft', 'rejected'].includes(String(existing.approval_status));
  if (!canEdit(session.role) && !canUpdateOwnDraft) {
    return { error: 'Only admins and owners can edit submitted expenses' };
  }

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
    parsed.data.assignedUserId,
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
      assignment_type: parsed.data.assignmentType ?? 'team',
      assigned_user_id: parsed.data.assignmentType === 'individual' ? parsed.data.assignedUserId : null,
      assigned_by: parsed.data.assignmentType === 'individual' ? session.user.id : null,
      is_shared: isShared,
      split_type: splitType,
      approval_status: canUpdateOwnDraft ? 'draft' : existing?.approval_status,
      submitted_by: canUpdateOwnDraft ? null : undefined,
      approved_by: canUpdateOwnDraft ? null : undefined,
      approved_at: canUpdateOwnDraft ? null : undefined,
      rejection_reason: canUpdateOwnDraft ? null : undefined,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };

  if (isShared) {
    await syncParticipants(supabase, id, participants, parsed.data.amount, splitType);
  } else {
    await supabase.from('lunch_entry_participants').delete().eq('entry_id', id);
  }

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_updated',
    entityType: 'expense',
    entityId: id,
    message: `Expense updated to ${parsed.data.amount}`,
    metadata: {
      amount: parsed.data.amount,
      shared: isShared,
      assignment_type: parsed.data.assignmentType ?? 'team',
      assigned_user_id: parsed.data.assignmentType === 'individual' ? parsed.data.assignedUserId : null,
    },
  });

  if (parsed.data.assignmentType === 'individual' && parsed.data.assignedUserId) {
    await recordActivity(supabase, {
      teamId: session.teamId,
      userId: session.user.id,
      actionType: 'expense_assigned',
      entityType: 'expense',
      entityId: id,
      message: `Expense assigned (${parsed.data.amount})`,
      metadata: { amount: parsed.data.amount, assigned_user_id: parsed.data.assignedUserId },
    });
  }

  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'info',
    title: 'Expense updated',
    body: `An expense was updated to ${parsed.data.amount}`,
    metadata: { entryId: id },
  });

  if (existing?.approval_status === 'approved' || existing?.approval_status === 'reimbursed') {
    await notifyBudgetThresholds(supabase, {
      teamId: session.teamId,
      actorId: session.user.id,
      excludeUserId: session.user.id,
    });
  }

  revalidateExpenseSurfaces();
  return { success: true };
}

export async function deleteLunchEntry(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Viewers cannot delete entries' };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('lunch_entries')
    .select('amount, notes')
    .eq('id', id)
    .eq('team_id', session.teamId)
    .maybeSingle();

  const { error } = await supabase
    .from('lunch_entries')
    .delete()
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_deleted',
    entityType: 'expense',
    entityId: id,
    message: `Expense deleted${existing?.amount ? ` (${existing.amount})` : ''}`,
    metadata: { amount: existing?.amount ?? null, notes: existing?.notes ?? null },
  });

  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'warning',
    title: 'Expense deleted',
    body: existing?.amount ? `An expense of ${existing.amount} was deleted` : 'An expense was deleted',
    metadata: { entryId: id },
  });

  await notifyBudgetThresholds(supabase, {
    teamId: session.teamId,
    actorId: session.user.id,
    excludeUserId: session.user.id,
  });
  revalidateExpenseSurfaces();
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
  revalidateExpenseSurfaces();
  return { success: true };
}

async function getEntryForWorkflow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  id: string,
) {
  const { data, error } = await supabase
    .from('lunch_entries')
    .select('id, team_id, created_by, submitted_by, user_id, amount, approval_status, reimbursement_status, amount_reimbursed')
    .eq('id', id)
    .eq('team_id', teamId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function submitExpenseForApproval(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();
  const entry = await getEntryForWorkflow(supabase, session.teamId, id);
  if (!entry) return { error: 'Expense not found' };
  if (entry.created_by !== session.user.id && !canEdit(session.role)) {
    return { error: 'Only the creator can submit this expense' };
  }
  if (!['draft', 'rejected'].includes(entry.approval_status)) {
    return { error: 'Only draft or rejected expenses can be submitted' };
  }

  const { error } = await supabase
    .from('lunch_entries')
    .update({
      approval_status: 'pending_approval',
      submitted_by: session.user.id,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);
  if (error) return { error: error.message };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_submitted',
    entityType: 'expense',
    entityId: id,
    message: `Expense submitted for approval (${entry.amount})`,
    metadata: { amount: entry.amount },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'expense_submitted',
    title: 'Expense submitted',
    body: `An expense of ${entry.amount} is waiting for approval`,
    metadata: { entryId: id },
  });
  revalidateExpenseSurfaces();
  return { success: true };
}

export async function approveExpense(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Only admins and owners can approve expenses' };
  const supabase = await createClient();
  const entry = await getEntryForWorkflow(supabase, session.teamId, id);
  if (!entry) return { error: 'Expense not found' };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('lunch_entries')
    .update({
      approval_status: 'approved',
      approved_by: session.user.id,
      approved_at: now,
      rejection_reason: null,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);
  if (error) return { error: error.message };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_approved',
    entityType: 'expense',
    entityId: id,
    message: `Expense approved (${entry.amount})`,
    metadata: { amount: entry.amount },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'expense_approved',
    title: 'Expense approved',
    body: `An expense of ${entry.amount} was approved`,
    metadata: { entryId: id },
    memberIds: entry.submitted_by ? [entry.submitted_by] : undefined,
  });
  await notifyBudgetThresholds(supabase, {
    teamId: session.teamId,
    actorId: session.user.id,
    excludeUserId: session.user.id,
  });
  revalidateExpenseSurfaces();
  return { success: true };
}

export async function rejectExpense(id: string, formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Only admins and owners can reject expenses' };
  const parsed = rejectionSchema.safeParse({ reason: formData.get('reason') });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Reason is required' };

  const supabase = await createClient();
  const entry = await getEntryForWorkflow(supabase, session.teamId, id);
  if (!entry) return { error: 'Expense not found' };

  const { error } = await supabase
    .from('lunch_entries')
    .update({
      approval_status: 'rejected',
      approved_by: session.user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: parsed.data.reason,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);
  if (error) return { error: error.message };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_rejected',
    entityType: 'expense',
    entityId: id,
    message: `Expense rejected: ${parsed.data.reason}`,
    metadata: { amount: entry.amount, reason: parsed.data.reason },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'expense_rejected',
    title: 'Expense rejected',
    body: parsed.data.reason,
    metadata: { entryId: id, reason: parsed.data.reason },
    memberIds: entry.submitted_by ? [entry.submitted_by] : undefined,
  });
  revalidateExpenseSurfaces();
  return { success: true };
}

export async function requestExpenseChanges(id: string, formData: FormData): Promise<ActionResult> {
  return rejectExpense(id, formData);
}

export async function recordExpenseReimbursement(id: string, formData: FormData): Promise<ActionResult> {
  const session = await requireTeam();
  if (!canEdit(session.role)) return { error: 'Only admins and owners can record reimbursements' };
  const parsed = reimbursementSchema.safeParse({
    amount: formData.get('amount'),
    reimbursedAt: formData.get('reimbursedAt'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid reimbursement' };

  const supabase = await createClient();
  const entry = await getEntryForWorkflow(supabase, session.teamId, id);
  if (!entry) return { error: 'Expense not found' };
  if (!['approved', 'reimbursed'].includes(entry.approval_status)) {
    return { error: 'Only approved expenses can be reimbursed' };
  }

  const amount = Number(entry.amount);
  const reimbursed = Math.min(amount, Number(entry.amount_reimbursed ?? 0) + parsed.data.amount);
  const reimbursementStatus = reimbursed >= amount ? 'fully_reimbursed' : 'partially_reimbursed';
  const { error } = await supabase
    .from('lunch_entries')
    .update({
      approval_status: reimbursementStatus === 'fully_reimbursed' ? 'reimbursed' : 'approved',
      reimbursement_status: reimbursementStatus,
      amount_reimbursed: reimbursed,
      reimbursed_at: parsed.data.reimbursedAt,
      reimbursement_notes: parsed.data.notes ?? null,
    })
    .eq('id', id)
    .eq('team_id', session.teamId);
  if (error) return { error: error.message };

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_reimbursed',
    entityType: 'expense',
    entityId: id,
    message: `Expense reimbursement recorded (${parsed.data.amount})`,
    metadata: { amount: parsed.data.amount, total_reimbursed: reimbursed, reimbursement_status: reimbursementStatus },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'reimbursement_completed',
    title: reimbursementStatus === 'fully_reimbursed' ? 'Reimbursement completed' : 'Reimbursement recorded',
    body: `Reimbursed ${parsed.data.amount} for an approved expense`,
    metadata: { entryId: id, amount: parsed.data.amount, reimbursementStatus },
    memberIds: entry.submitted_by ? [entry.submitted_by] : undefined,
  });
  revalidateExpenseSurfaces();
  return { success: true };
}
