import { createClient } from '@/lib/supabase/server';
import {
  computeUserBalances,
  getPersonalBalance,
  getTeamDebtSummary,
  type BalanceEntry,
  type SettlementRecord,
} from '@/lib/balance/engine';
import type { Settlement, SettlementWithProfiles } from '@/lib/database.types';
import type { Profile } from '@/lib/database.types';

async function attachSettlementProfiles(
  items: Settlement[],
): Promise<SettlementWithProfiles[]> {
  if (!items.length) return [];
  const supabase = await createClient();
  const ids = [
    ...new Set(
      items.flatMap((s) => [s.payer_user_id, s.receiver_user_id, s.created_by]),
    ),
  ];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return items.map((s) => ({
    ...s,
    payer: (map.get(s.payer_user_id) as Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>) ?? null,
    receiver: (map.get(s.receiver_user_id) as Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>) ?? null,
  }));
}

export async function getBalanceContext(
  teamId: string,
  currentUserId?: string,
  range?: { from: string; to: string },
) {
  const supabase = await createClient();

  const [entriesRes, settlementsRes, membersRes] = await Promise.all([
    (() => {
      let query = supabase
      .from('lunch_entries')
      .select('id, user_id, amount, is_shared, split_type')
      .eq('team_id', teamId)
      .eq('is_shared', true);
      if (range) query = query.gte('lunch_date', range.from).lte('lunch_date', range.to);
      return query;
    })(),
    (() => {
      let query = supabase.from('settlements').select('*').eq('team_id', teamId).order('created_at', { ascending: false });
      if (range) query = query.gte('created_at', `${range.from}T00:00:00`).lte('created_at', `${range.to}T23:59:59`);
      return query;
    })(),
    supabase.from('team_members').select('user_id').eq('team_id', teamId),
  ]);

  const entryIds = (entriesRes.data ?? []).map((e) => e.id);
  let participantsData: { entry_id: string; user_id: string; share_amount: number | null }[] = [];
  if (entryIds.length) {
    const { data } = await supabase
      .from('lunch_entry_participants')
      .select('entry_id, user_id, share_amount')
      .in('entry_id', entryIds);
    participantsData = data ?? [];
  }

  const participantMap = new Map<string, { userId: string; shareAmount?: number | null }[]>();
  participantsData.forEach((p) => {
    const list = participantMap.get(p.entry_id) ?? [];
    list.push({ userId: p.user_id, shareAmount: p.share_amount });
    participantMap.set(p.entry_id, list);
  });

  const balanceEntries: BalanceEntry[] = (entriesRes.data ?? []).map((e) => ({
    id: e.id,
    payerId: e.user_id,
    amount: Number(e.amount),
    isShared: e.is_shared,
    splitType: e.split_type as BalanceEntry['splitType'],
    participants: participantMap.get(e.id) ?? [],
  }));

  const settlements = (settlementsRes.data ?? []) as Settlement[];
  const settlementRecords: SettlementRecord[] = settlements.map((s) => ({
    payerUserId: s.payer_user_id,
    receiverUserId: s.receiver_user_id,
    amount: Number(s.amount),
    status: s.status,
  }));

  const memberIds = (membersRes.data ?? []).map((m) => m.user_id);
  const userBalances = computeUserBalances(balanceEntries, settlementRecords, memberIds);
  const debtSummary = getTeamDebtSummary(balanceEntries, settlementRecords);
  const personal = currentUserId
    ? getPersonalBalance(currentUserId, balanceEntries, settlementRecords, memberIds)
    : { youOwe: 0, youReceive: 0 };

  const pendingSettlements = settlements.filter((s) => s.status === 'pending');
  const completedSettlements = settlements.filter((s) => s.status === 'completed').slice(0, 10);

  return {
    userBalances,
    debtSummary,
    personal,
    pendingTotal: debtSummary.totalPending,
    settlements: await attachSettlementProfiles(settlements),
    pendingSettlements: await attachSettlementProfiles(pendingSettlements),
    recentCompleted: await attachSettlementProfiles(completedSettlements),
  };
}

export async function getSettlementsPageData(teamId: string, range?: { from: string; to: string }) {
  return getBalanceContext(teamId, undefined, range);
}
