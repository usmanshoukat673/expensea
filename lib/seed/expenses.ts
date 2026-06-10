import type { SeedAdmin } from '@/lib/seed/client';
import type { UserMap } from '@/lib/seed/auth';
import type { TeamMap } from '@/lib/seed/teams';
import { DEMO_TEAMS, EXPENSE_NOTES, CATEGORY_SLUG_WEIGHTS } from '@/lib/seed/config';
import {
  categoryAmountRange,
  chunk,
  initFaker,
  log,
  monthStart,
  pick,
  pickWeighted,
  randomAmount,
  randomExpenseDate,
  toDateString,
} from '@/lib/seed/utils';
import { faker } from '@faker-js/faker';

type EntryInsert = {
  team_id: string;
  user_id: string;
  amount: number;
  lunch_date: string;
  notes: string | null;
  payment_status: 'paid' | 'unpaid';
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'reimbursed';
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  reimbursement_status: 'not_reimbursed' | 'partially_reimbursed' | 'fully_reimbursed';
  amount_reimbursed: number;
  reimbursed_at: string | null;
  reimbursement_notes: string | null;
  category_id: string | null;
  assigned_user_id: string | null;
  assigned_by: string | null;
  assignment_type: 'team' | 'individual';
  is_shared: boolean;
  split_type: 'none' | 'equal' | 'selected';
  created_by: string;
  created_at: string;
};

type ParticipantInsert = {
  entry_id: string;
  user_id: string;
  share_amount: number;
};

function splitAmountIntoCents(amount: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(amount * 100);
  const base = Math.trunc(cents / count);
  const remainder = cents - base * count;

  return Array.from({ length: count }, (_, index) =>
    (base + (index < remainder ? 1 : 0)) / 100,
  );
}

export async function seedDemoExpenses(
  admin: SeedAdmin,
  users: UserMap,
  teams: TeamMap,
): Promise<{ entryCount: number; sharedCount: number }> {
  initFaker();
  const teamIds = [...teams.values()].map((t) => t.id);
  await admin.from('lunch_entries').delete().in('team_id', teamIds);

  const allEntries: EntryInsert[] = [];
  const now = new Date();
  const currentMonth = monthStart(now);

  for (const def of DEMO_TEAMS) {
    const ctx = teams.get(def.slug);
    if (!ctx || !ctx.memberIds.length) continue;

    const editorId =
      users.get(def.ownerEmail) ?? ctx.memberIds[0];

    for (let i = 0; i < def.expenseTarget; i++) {
      const slug = pickWeighted(CATEGORY_SLUG_WEIGHTS);
      const categoryId = ctx.categories.get(slug) ?? null;
      const payerId = pick(ctx.memberIds);
      const date = randomExpenseDate(8);
      const dateStr = toDateString(date);
      const [min, max] = categoryAmountRange(slug);

      let amount = randomAmount(min, max);
      if (def.slug === 'expensea-hq' && monthStart(date) === currentMonth && slug === 'food') {
        amount = randomAmount(1800, 4200);
      }

      const isShared = Math.random() < 0.32 && ctx.memberIds.length >= 3;
      const assignedUserId = !isShared && Math.random() < 0.38 ? pick(ctx.memberIds) : null;
      const splitType: 'none' | 'equal' | 'selected' = isShared
        ? Math.random() < 0.25
          ? 'selected'
          : 'equal'
        : 'none';
      const approvalRoll = Math.random();
      const approvalStatus =
        approvalRoll < 0.12
          ? 'pending_approval'
          : approvalRoll < 0.2
            ? 'rejected'
            : approvalRoll < 0.32
              ? 'reimbursed'
              : 'approved';
      const submittedBy = approvalStatus === 'approved' ? (Math.random() < 0.7 ? payerId : editorId) : payerId;
      const approvedBy = ['approved', 'rejected', 'reimbursed'].includes(approvalStatus) ? editorId : null;
      const approvedAt = approvedBy ? toDateString(date) : null;
      const reimbursementStatus =
        approvalStatus === 'reimbursed'
          ? 'fully_reimbursed'
          : approvalStatus === 'approved' && Math.random() < 0.18
            ? 'partially_reimbursed'
            : 'not_reimbursed';
      const amountReimbursed =
        reimbursementStatus === 'fully_reimbursed'
          ? amount
          : reimbursementStatus === 'partially_reimbursed'
            ? Math.round(amount * (0.35 + Math.random() * 0.4) * 100) / 100
            : 0;

      allEntries.push({
        team_id: ctx.id,
        user_id: payerId,
        amount,
        lunch_date: dateStr,
        notes:
          pick(EXPENSE_NOTES) +
          (Math.random() < 0.25 ? ` — ${faker.commerce.productName()}` : ''),
        payment_status: Math.random() < 0.55 ? 'paid' : 'unpaid',
        approval_status: approvalStatus,
        submitted_by: submittedBy,
        approved_by: approvedBy,
        approved_at: approvedAt ? new Date(`${approvedAt}T10:00:00Z`).toISOString() : null,
        rejection_reason:
          approvalStatus === 'rejected'
            ? pick(['Missing receipt', 'Outside policy limit', 'Duplicate claim', 'Needs project code'])
            : null,
        reimbursement_status: reimbursementStatus,
        amount_reimbursed: amountReimbursed,
        reimbursed_at: amountReimbursed > 0 ? toDateString(date) : null,
        reimbursement_notes: amountReimbursed > 0 ? pick(['Bank transfer processed', 'Payroll reimbursement', 'Petty cash reimbursement']) : null,
        category_id: categoryId,
        assigned_user_id: assignedUserId,
        assigned_by: assignedUserId ? editorId : null,
        assignment_type: assignedUserId ? 'individual' : 'team',
        is_shared: isShared,
        split_type: splitType,
        created_by: editorId,
        created_at: date.toISOString(),
      });
    }
  }

  const insertedIds: { row: EntryInsert; id: string }[] = [];
  let sharedCount = 0;

  for (const batch of chunk(allEntries, 80)) {
    const { data, error } = await admin
      .from('lunch_entries')
      .insert(batch)
      .select('id, team_id, user_id, amount, is_shared, split_type');

    if (error) throw new Error(`Expenses batch: ${error.message}`);
    for (let i = 0; i < (data ?? []).length; i++) {
      const row = data![i];
      const src = batch[i];
      insertedIds.push({ row: src, id: row.id });
      if (row.is_shared) sharedCount++;
    }
  }

  const participants: ParticipantInsert[] = [];

  for (const { row, id } of insertedIds) {
    if (!row.is_shared || (row.split_type !== 'equal' && row.split_type !== 'selected')) continue;
    const ctx = [...teams.values()].find((t) => t.id === row.team_id);
    if (!ctx) continue;

    if (row.split_type === 'equal') {
      const shares = splitAmountIntoCents(row.amount, ctx.memberIds.length);
      for (let i = 0; i < ctx.memberIds.length; i++) {
        participants.push({
          entry_id: id,
          user_id: ctx.memberIds[i],
          share_amount: shares[i] ?? 0,
        });
      }
      continue;
    }

    const pool = shuffle([...ctx.memberIds]);
    const count = Math.min(pool.length, 2 + Math.floor(Math.random() * Math.max(1, pool.length - 1)));
    const selected = pool.slice(0, count);
    const weights = selected.map(() => 1 + Math.random() * 3);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let allocated = 0;
    for (let i = 0; i < selected.length; i++) {
      const uid = selected[i];
      const share =
        i === selected.length - 1
          ? Math.round((row.amount - allocated) * 100) / 100
          : Math.round((row.amount * (weights[i] / totalWeight)) * 100) / 100;
      allocated = Math.round((allocated + share) * 100) / 100;
      participants.push({ entry_id: id, user_id: uid, share_amount: share });
    }
  }

  for (const batch of chunk(participants, 100)) {
    const { error } = await admin.from('lunch_entry_participants').insert(batch);
    if (error) throw new Error(`Participants: ${error.message}`);
  }

  log('expenses', `${insertedIds.length} entries (${sharedCount} shared)`);
  return { entryCount: insertedIds.length, sharedCount };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
