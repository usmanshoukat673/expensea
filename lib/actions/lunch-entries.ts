'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { lunchEntrySchema, rejectionSchema, reimbursementSchema } from '@/lib/validations';
import { notifyTeamMembers } from '@/lib/notifications';
import { recordActivity } from '@/lib/activity';
import { notifyBudgetThresholds } from '@/lib/budget-alerts';
import { FINANCIAL_AMOUNT_MAX } from '@/lib/financial-input';
import { formatCurrencyAmount } from '@/lib/currency';

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
  revalidatePath('/notifications');
  revalidatePath('/activity');
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

function parseParticipantShares(formData: FormData): Record<string, number> {
  const raw = formData.get('participantShares');
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const shares: Record<string, number> = {};
    for (const [userId, value] of Object.entries(parsed)) {
      const amount = Number(value);
      if (
        Number.isFinite(amount) &&
        amount > 0 &&
        amount <= FINANCIAL_AMOUNT_MAX &&
        Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8
      ) {
        shares[userId] = amount;
      }
    }
    return shares;
  } catch {
    return {};
  }
}

function formatExpenseAmount(amount: number | string | null | undefined) {
  return formatCurrencyAmount(Number(amount ?? 0));
}

function actorLabel(session: Awaited<ReturnType<typeof requireTeam>>) {
  return session.profile.full_name ?? session.profile.email ?? 'A team member';
}

function splitAmountIntoCents(amount: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(amount * 100);
  const base = Math.trunc(cents / count);
  const remainder = cents - base * count;

  return Array.from({ length: count }, (_, index) =>
    (base + (index < remainder ? 1 : 0)) / 100,
  );
}

async function getCategoryName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  categoryId?: string | null,
) {
  if (!categoryId) return 'Expense';
  const { data, error } = await supabase
    .from('expense_categories')
    .select('name')
    .eq('id', categoryId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load expense category for event description', {
      teamId,
      categoryId,
      error: error.message,
    });
  }

  return data?.name ? `${data.name} Expense` : 'Expense';
}

async function syncParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entryId: string,
  participantIds: string[],
  amount: number,
  splitType: 'equal' | 'selected' | 'none',
  participantShares: Record<string, number> = {},
): Promise<string | null> {
  const { error: deleteError } = await supabase
    .from('lunch_entry_participants')
    .delete()
    .eq('entry_id', entryId);

  if (deleteError) {
    console.error('Failed to clear shared expense participants', {
      entryId,
      error: deleteError.message,
    });
    return deleteError.message;
  }

  if (!participantIds.length || splitType === 'none') return null;

  const equalShares = splitType === 'equal'
    ? splitAmountIntoCents(amount, participantIds.length)
    : [];

  const { error: insertError } = await supabase.from('lunch_entry_participants').insert(
    participantIds.map((userId, index) => ({
      entry_id: entryId,
      user_id: userId,
      share_amount: splitType === 'selected'
        ? participantShares[userId] ?? null
        : equalShares[index] ?? null,
    })),
  );

  if (insertError) {
    console.error('Failed to save shared expense participants', {
      entryId,
      splitType,
      participantIds,
      error: insertError.message,
    });
    return insertError.message;
  }

  return null;
}

function validateSplitRules(params: {
  assignmentType: 'team' | 'individual';
  isShared: boolean;
  splitType: 'equal' | 'selected' | 'none';
  participants: string[];
  participantShares: Record<string, number>;
  amount: number;
}) {
  if (params.assignmentType === 'individual') return null;
  if (!params.isShared) return null;
  if (!params.participants.length) return 'Select at least one participant for a team expense';
  if (params.splitType !== 'selected') return null;

  const missingShare = params.participants.some((id) => !params.participantShares[id]);
  if (missingShare) return 'Enter a custom amount for every selected participant';

  const total = params.participants.reduce((sum, id) => sum + Number(params.participantShares[id] ?? 0), 0);
  if (Math.abs(total - params.amount) > 0.01) {
    return 'Custom split amounts must add up to the expense amount';
  }

  return null;
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
  const participantShares = parseParticipantShares(formData);
  const assignmentType = formData.get('assignmentType') === 'individual' ? 'individual' : 'team';
  const intent = formData.get('intent') === 'submit' ? 'submit' : 'draft';
  const parsed = lunchEntrySchema.safeParse({
    userId: formData.get('userId'),
    amount: formData.get('amount'),
    lunchDate: formData.get('lunchDate'),
    notes: formData.get('notes') || undefined,
    paymentStatus: formData.get('paymentStatus'),
    categoryId: formData.get('categoryId') || null,
    isShared: assignmentType === 'team' && formData.get('isShared') === 'true',
    splitType: assignmentType === 'team' ? formData.get('splitType') || 'none' : 'none',
    participantIds,
    assignmentType,
    assignedUserId: assignmentType === 'individual' ? formData.get('assignedUserId') || null : null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please check the form and try again' };

  const isShared = parsed.data.assignmentType === 'team' && (parsed.data.isShared ?? false);
  const splitType = isShared ? (parsed.data.splitType ?? 'equal') : 'none';
  const participants =
    isShared && participantIds.length
      ? participantIds
      : isShared
        ? []
        : [];

  const splitError = validateSplitRules({
    assignmentType: parsed.data.assignmentType ?? 'team',
    isShared,
    splitType,
    participants,
    participantShares,
    amount: parsed.data.amount,
  });
  if (splitError) return { error: splitError };

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
    const participantError = await syncParticipants(
      supabase,
      row.id,
      participants,
      parsed.data.amount,
      splitType,
      participantShares,
    );
    if (participantError) {
      const { error: rollbackError } = await supabase
        .from('lunch_entries')
        .delete()
        .eq('id', row.id)
        .eq('team_id', session.teamId);

      if (rollbackError) {
        console.error('Failed to roll back shared expense after participant save failure', {
          entryId: row.id,
          error: rollbackError.message,
        });
      }

      return { error: `Failed to save shared expense participants: ${participantError}` };
    }
  }

  const categoryName = await getCategoryName(supabase, session.teamId, parsed.data.categoryId);
  const amountLabel = formatExpenseAmount(parsed.data.amount);
  const actor = actorLabel(session);
  const createdMessage =
    intent === 'submit'
      ? `${actor} submitted ${categoryName} for ${amountLabel}`
      : `${actor} created ${categoryName} for ${amountLabel}`;

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: intent === 'submit' ? 'expense_submitted' : 'expense_created',
    entityType: 'expense',
    entityId: row.id,
    message: createdMessage,
    metadata: {
      amount: parsed.data.amount,
      amount_label: amountLabel,
      category_name: categoryName,
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
      message: `${actor} assigned ${categoryName} to a member for ${amountLabel}`,
      metadata: {
        amount: parsed.data.amount,
        amount_label: amountLabel,
        category_name: categoryName,
        assigned_user_id: parsed.data.assignedUserId,
      },
    });
  }

  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: intent === 'submit' ? 'expense_submitted' : 'new_expense',
    title: intent === 'submit' ? 'Expense submitted' : 'New expense added',
    body: intent === 'submit'
      ? `${actor} submitted ${categoryName} for ${amountLabel}`
      : `${actor} created ${categoryName} for ${amountLabel}`,
    link: intent === 'submit' ? '/approvals' : '/entries',
    metadata: { entryId: row.id, categoryName, amount: parsed.data.amount },
    audience: 'admins',
  });

  if (intent === 'submit') {
    await notifyTeamMembers({
      teamId: session.teamId,
      type: 'expense_submitted',
      title: 'Expense submitted',
      body: `Your ${categoryName} for ${amountLabel} is waiting for approval`,
      link: '/approvals',
      metadata: { entryId: row.id, categoryName, amount: parsed.data.amount },
      memberIds: [session.user.id],
      audience: 'personal',
    });
  }

  if (parsed.data.assignmentType === 'individual' && parsed.data.assignedUserId) {
    await notifyTeamMembers({
      teamId: session.teamId,
      type: 'expense_assigned',
      title: 'Expense assigned to you',
      body: `${actor} assigned ${categoryName} to you for ${amountLabel}`,
      link: '/my-expenses',
      metadata: { entryId: row.id, categoryName, amount: parsed.data.amount },
      memberIds: [parsed.data.assignedUserId],
      audience: 'personal',
    });
  }

  if (isShared) {
    await recordActivity(supabase, {
      teamId: session.teamId,
      userId: session.user.id,
      actionType: 'shared_expense_created',
      entityType: 'expense',
      entityId: row.id,
      message: `${actor} created a shared ${categoryName.toLowerCase()} for ${amountLabel}`,
      metadata: {
        amount: parsed.data.amount,
        amount_label: amountLabel,
        category_name: categoryName,
        split_type: splitType,
        participant_ids: participants,
      },
    });
    await notifyTeamMembers({
      teamId: session.teamId,
      excludeUserId: session.user.id,
      type: 'shared_expense',
      title: 'New shared expense',
      body: `${actor} created ${categoryName} for ${amountLabel}`,
      link: '/settlements',
      metadata: { entryId: row.id, splitType, participantIds: participants },
      memberIds: participants.filter((id) => id !== session.user.id),
      audience: 'personal',
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
  const participantShares = parseParticipantShares(formData);
  const assignmentType = formData.get('assignmentType') === 'individual' ? 'individual' : 'team';
  const parsed = lunchEntrySchema.safeParse({
    userId: formData.get('userId'),
    amount: formData.get('amount'),
    lunchDate: formData.get('lunchDate'),
    notes: formData.get('notes') || undefined,
    paymentStatus: formData.get('paymentStatus'),
    categoryId: formData.get('categoryId') || null,
    isShared: assignmentType === 'team' && formData.get('isShared') === 'true',
    splitType: assignmentType === 'team' ? formData.get('splitType') || 'none' : 'none',
    participantIds,
    assignmentType,
    assignedUserId: assignmentType === 'individual' ? formData.get('assignedUserId') || null : null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please check the form and try again' };

  const isShared = parsed.data.assignmentType === 'team' && (parsed.data.isShared ?? false);
  const splitType = isShared ? (parsed.data.splitType ?? 'equal') : 'none';

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('lunch_entries')
    .select('created_by, approval_status, assigned_user_id')
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
      ? participantIds
      : isShared
        ? []
        : [];
  const splitError = validateSplitRules({
    assignmentType: parsed.data.assignmentType ?? 'team',
    isShared,
    splitType,
    participants,
    participantShares,
    amount: parsed.data.amount,
  });
  if (splitError) return { error: splitError };

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
    const participantError = await syncParticipants(
      supabase,
      id,
      participants,
      parsed.data.amount,
      splitType,
      participantShares,
    );
    if (participantError) {
      return { error: `Failed to save shared expense participants: ${participantError}` };
    }
  } else {
    const { error: participantDeleteError } = await supabase
      .from('lunch_entry_participants')
      .delete()
      .eq('entry_id', id);
    if (participantDeleteError) {
      console.error('Failed to clear participants for non-shared expense', {
        entryId: id,
        error: participantDeleteError.message,
      });
      return { error: participantDeleteError.message };
    }
  }

  const categoryName = await getCategoryName(supabase, session.teamId, parsed.data.categoryId);
  const amountLabel = formatExpenseAmount(parsed.data.amount);
  const actor = actorLabel(session);

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_updated',
    entityType: 'expense',
    entityId: id,
    message: `${actor} updated ${categoryName} to ${amountLabel}`,
    metadata: {
      amount: parsed.data.amount,
      amount_label: amountLabel,
      category_name: categoryName,
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
      message: `${actor} assigned ${categoryName} to a member for ${amountLabel}`,
      metadata: {
        amount: parsed.data.amount,
        amount_label: amountLabel,
        category_name: categoryName,
        assigned_user_id: parsed.data.assignedUserId,
      },
    });
  }

  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'info',
    title: 'Expense updated',
    body: `${actor} updated ${categoryName} to ${amountLabel}`,
    link: '/entries',
    metadata: { entryId: id, categoryName, amount: parsed.data.amount },
    audience: 'admins',
  });

  if (
    parsed.data.assignmentType === 'individual' &&
    parsed.data.assignedUserId &&
    parsed.data.assignedUserId !== existing?.assigned_user_id
  ) {
    await notifyTeamMembers({
      teamId: session.teamId,
      type: 'expense_assigned',
      title: 'Expense assigned to you',
      body: `${actor} assigned ${categoryName} to you for ${amountLabel}`,
      link: '/my-expenses',
      metadata: { entryId: id, categoryName, amount: parsed.data.amount },
      memberIds: [parsed.data.assignedUserId],
      audience: 'personal',
    });
  }

  if (isShared) {
    await recordActivity(supabase, {
      teamId: session.teamId,
      userId: session.user.id,
      actionType: 'split_updated',
      entityType: 'expense',
      entityId: id,
      message: `${actor} updated split participants for ${categoryName}`,
      metadata: {
        amount: parsed.data.amount,
        amount_label: amountLabel,
        category_name: categoryName,
        split_type: splitType,
        participant_ids: participants,
      },
    });
  }

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
    .select('amount, notes, category_id, assigned_user_id, created_by')
    .eq('id', id)
    .eq('team_id', session.teamId)
    .maybeSingle();

  const { error } = await supabase
    .from('lunch_entries')
    .delete()
    .eq('id', id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };

  const categoryName = await getCategoryName(supabase, session.teamId, existing?.category_id);
  const amountLabel = formatExpenseAmount(existing?.amount);
  const actor = actorLabel(session);

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_deleted',
    entityType: 'expense',
    entityId: id,
    message: `${actor} deleted ${categoryName}${existing?.amount ? ` for ${amountLabel}` : ''}`,
    metadata: {
      amount: existing?.amount ?? null,
      amount_label: amountLabel,
      category_name: categoryName,
      notes: existing?.notes ?? null,
    },
  });

  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'warning',
    title: 'Expense deleted',
    body: `${actor} deleted ${categoryName}${existing?.amount ? ` for ${amountLabel}` : ''}`,
    link: '/entries',
    metadata: { entryId: id, categoryName, amount: existing?.amount ?? null },
    audience: 'admins',
  });

  const personalTargets = [existing?.created_by, existing?.assigned_user_id].filter(
    (userId): userId is string => Boolean(userId) && userId !== session.user.id,
  );
  if (personalTargets.length) {
    await notifyTeamMembers({
      teamId: session.teamId,
      type: 'warning',
      title: 'Expense deleted',
      body: `${categoryName}${existing?.amount ? ` for ${amountLabel}` : ''} was deleted`,
      link: '/entries',
      metadata: { entryId: id, categoryName, amount: existing?.amount ?? null },
      memberIds: personalTargets,
      audience: 'personal',
    });
  }

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
  const { data: existingRows, error: fetchError } = await supabase
    .from('lunch_entries')
    .select('id, amount')
    .in('id', ids)
    .eq('team_id', session.teamId);
  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from('lunch_entries')
    .delete()
    .in('id', ids)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  const count = existingRows?.length ?? ids.length;
  const total = (existingRows ?? []).reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_bulk_deleted',
    entityType: 'expense',
    message: `${actorLabel(session)} deleted ${count} expenses`,
    metadata: { count, total_amount: total, entry_ids: ids },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'warning',
    title: 'Expenses deleted',
    body: `${actorLabel(session)} deleted ${count} expenses`,
    link: '/entries',
    metadata: { count, totalAmount: total, entryIds: ids },
    audience: 'admins',
  });
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
    .select('id, team_id, created_by, submitted_by, user_id, amount, category_id, approval_status, reimbursement_status, amount_reimbursed')
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

  const categoryName = await getCategoryName(supabase, session.teamId, entry.category_id);
  const amountLabel = formatExpenseAmount(entry.amount);
  const actor = actorLabel(session);

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_submitted',
    entityType: 'expense',
    entityId: id,
    message: `${actor} submitted ${categoryName} for ${amountLabel}`,
    metadata: { amount: entry.amount, amount_label: amountLabel, category_name: categoryName },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'expense_submitted',
    title: 'Expense submitted',
    body: `${actor} submitted ${categoryName} for ${amountLabel}`,
    link: '/approvals',
    metadata: { entryId: id, categoryName, amount: entry.amount },
    audience: 'admins',
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    type: 'expense_submitted',
    title: 'Expense submitted',
    body: `Your ${categoryName} for ${amountLabel} is waiting for approval`,
    link: '/approvals',
    metadata: { entryId: id, categoryName, amount: entry.amount },
    memberIds: [session.user.id],
    audience: 'personal',
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

  const categoryName = await getCategoryName(supabase, session.teamId, entry.category_id);
  const amountLabel = formatExpenseAmount(entry.amount);
  const actor = actorLabel(session);
  const creatorId = entry.submitted_by ?? entry.created_by;

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_approved',
    entityType: 'expense',
    entityId: id,
    message: `${actor} approved ${categoryName} for ${amountLabel}`,
    metadata: { amount: entry.amount, amount_label: amountLabel, category_name: categoryName },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    type: 'expense_approved',
    title: 'Your expense has been approved',
    body: `${categoryName} for ${amountLabel} was approved`,
    link: '/entries',
    metadata: { entryId: id, categoryName, amount: entry.amount },
    memberIds: creatorId ? [creatorId] : undefined,
    audience: 'personal',
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    excludeUserId: session.user.id,
    type: 'expense_approved',
    title: 'Expense approved',
    body: `${actor} approved ${categoryName} for ${amountLabel}`,
    link: '/approvals',
    metadata: { entryId: id, categoryName, amount: entry.amount },
    audience: 'admins',
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

  const categoryName = await getCategoryName(supabase, session.teamId, entry.category_id);
  const amountLabel = formatExpenseAmount(entry.amount);
  const actor = actorLabel(session);
  const creatorId = entry.submitted_by ?? entry.created_by;

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_rejected',
    entityType: 'expense',
    entityId: id,
    message: `${actor} rejected ${categoryName} for ${amountLabel}: ${parsed.data.reason}`,
    metadata: {
      amount: entry.amount,
      amount_label: amountLabel,
      category_name: categoryName,
      reason: parsed.data.reason,
    },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    type: 'expense_rejected',
    title: 'Expense rejected',
    body: `${categoryName} for ${amountLabel} was rejected: ${parsed.data.reason}`,
    link: '/entries',
    metadata: { entryId: id, categoryName, amount: entry.amount, reason: parsed.data.reason },
    memberIds: creatorId ? [creatorId] : undefined,
    audience: 'personal',
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
  const remaining = Math.max(0, amount - Number(entry.amount_reimbursed ?? 0));
  if (parsed.data.amount > remaining) {
    return { error: 'Amount exceeds allowed limit' };
  }
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

  const categoryName = await getCategoryName(supabase, session.teamId, entry.category_id);
  const amountLabel = formatExpenseAmount(parsed.data.amount);
  const actor = actorLabel(session);
  const creatorId = entry.submitted_by ?? entry.created_by;

  await recordActivity(supabase, {
    teamId: session.teamId,
    userId: session.user.id,
    actionType: 'expense_reimbursed',
    entityType: 'expense',
    entityId: id,
    message: `${actor} recorded reimbursement of ${amountLabel}`,
    metadata: {
      amount: parsed.data.amount,
      amount_label: amountLabel,
      category_name: categoryName,
      total_reimbursed: reimbursed,
      reimbursement_status: reimbursementStatus,
    },
  });
  await notifyTeamMembers({
    teamId: session.teamId,
    type: 'reimbursement_completed',
    title: reimbursementStatus === 'fully_reimbursed' ? 'Reimbursement completed' : 'Reimbursement recorded',
    body: `${amountLabel} was reimbursed for ${categoryName}`,
    link: '/entries',
    metadata: { entryId: id, amount: parsed.data.amount, reimbursementStatus },
    memberIds: creatorId ? [creatorId] : undefined,
    audience: 'personal',
  });
  revalidateExpenseSurfaces();
  return { success: true };
}
