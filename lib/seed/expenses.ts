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
  category_id: string | null;
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
      const splitType: 'none' | 'equal' = isShared ? 'equal' : 'none';

      allEntries.push({
        team_id: ctx.id,
        user_id: payerId,
        amount,
        lunch_date: dateStr,
        notes:
          pick(EXPENSE_NOTES) +
          (Math.random() < 0.25 ? ` — ${faker.commerce.productName()}` : ''),
        payment_status: Math.random() < 0.55 ? 'paid' : 'unpaid',
        category_id: categoryId,
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
    if (!row.is_shared || row.split_type !== 'equal') continue;
    const ctx = [...teams.values()].find((t) => t.id === row.team_id);
    if (!ctx) continue;

    const pool = ctx.memberIds.filter((id) => id !== row.user_id);
    const count = Math.min(pool.length, 2 + Math.floor(Math.random() * 4));
    const selected = shuffle([...pool]).slice(0, count);
    const allParticipants = [row.user_id, ...selected];
    const share = Math.round((row.amount / allParticipants.length) * 100) / 100;

    for (const uid of allParticipants) {
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
