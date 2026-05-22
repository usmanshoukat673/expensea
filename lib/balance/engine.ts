export type SplitType = 'none' | 'equal' | 'selected';

export type BalanceEntry = {
  id: string;
  payerId: string;
  amount: number;
  isShared: boolean;
  splitType: SplitType;
  participants: { userId: string; shareAmount?: number | null }[];
};

export type SettlementRecord = {
  payerUserId: string;
  receiverUserId: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
};

export type UserBalance = {
  userId: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
};

export type DebtEdge = {
  from: string;
  to: string;
  amount: number;
};

function debtKey(from: string, to: string) {
  return `${from}:${to}`;
}

function addDebt(map: Map<string, number>, from: string, to: string, amount: number) {
  if (from === to || amount <= 0) return;
  const key = debtKey(from, to);
  map.set(key, (map.get(key) ?? 0) + amount);
}

function netPair(map: Map<string, number>, a: string, b: string): number {
  const ab = map.get(debtKey(a, b)) ?? 0;
  const ba = map.get(debtKey(b, a)) ?? 0;
  return ab - ba;
}

export function computeParticipantShares(entry: BalanceEntry): Map<string, number> {
  const shares = new Map<string, number>();
  if (!entry.isShared || entry.splitType === 'none') return shares;

  const ids = entry.participants.map((p) => p.userId);
  if (!ids.length) return shares;

  if (entry.splitType === 'equal') {
    const share = entry.amount / ids.length;
    ids.forEach((id) => shares.set(id, share));
    return shares;
  }

  const customTotal = entry.participants.reduce(
    (s, p) => s + (p.shareAmount != null ? Number(p.shareAmount) : 0),
    0,
  );
  if (customTotal > 0) {
    entry.participants.forEach((p) => {
      if (p.shareAmount != null) shares.set(p.userId, Number(p.shareAmount));
    });
    return shares;
  }

  const share = entry.amount / ids.length;
  ids.forEach((id) => shares.set(id, share));
  return shares;
}

export function computeRawDebts(entries: BalanceEntry[]): Map<string, number> {
  const debts = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.isShared || entry.splitType === 'none') continue;
    const shares = computeParticipantShares(entry);
    shares.forEach((share, userId) => {
      if (userId !== entry.payerId) {
        addDebt(debts, userId, entry.payerId, share);
      }
    });
  }

  return debts;
}

export function applySettlementsToDebts(
  rawDebts: Map<string, number>,
  settlements: SettlementRecord[],
): Map<string, number> {
  const debts = new Map(rawDebts);

  for (const s of settlements) {
    if (s.status === 'cancelled') continue;
    if (s.status === 'completed') {
      addDebt(debts, s.payerUserId, s.receiverUserId, -Number(s.amount));
    }
  }

  return debts;
}

export function simplifyDebts(rawDebts: Map<string, number>): DebtEdge[] {
  const balances = new Map<string, number>();

  rawDebts.forEach((amount, key) => {
    const [from, to] = key.split(':');
    balances.set(from, (balances.get(from) ?? 0) - amount);
    balances.set(to, (balances.get(to) ?? 0) + amount);
  });

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  balances.forEach((net, id) => {
    const rounded = Math.round(net * 100) / 100;
    if (rounded > 0.01) creditors.push({ id, amount: rounded });
    else if (rounded < -0.01) debtors.push({ id, amount: -rounded });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const result: DebtEdge[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0.01) {
      result.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(pay * 100) / 100 });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return result;
}

export function computeUserBalances(
  entries: BalanceEntry[],
  settlements: SettlementRecord[],
  memberIds: string[],
): UserBalance[] {
  const raw = computeRawDebts(entries);
  const netted = applySettlementsToDebts(raw, settlements);

  return memberIds.map((userId) => {
    let totalPaid = 0;
    let totalOwed = 0;

    entries.forEach((e) => {
      if (e.payerId === userId) totalPaid += e.amount;
    });

    memberIds.forEach((other) => {
      if (other === userId) return;
      const owed = netPair(netted, userId, other);
      if (owed > 0) totalOwed += owed;
    });

    let shouldReceive = 0;
    memberIds.forEach((other) => {
      if (other === userId) return;
      const owed = netPair(netted, other, userId);
      if (owed > 0) shouldReceive += owed;
    });

    return {
      userId,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      netBalance: Math.round((shouldReceive - totalOwed) * 100) / 100,
    };
  });
}

export function getTeamDebtSummary(
  entries: BalanceEntry[],
  settlements: SettlementRecord[],
): { edges: DebtEdge[]; totalPending: number } {
  const raw = computeRawDebts(entries);
  const netted = applySettlementsToDebts(raw, settlements);
  const edges = simplifyDebts(netted);
  const totalPending = edges.reduce((s, e) => s + e.amount, 0);
  return { edges, totalPending: Math.round(totalPending * 100) / 100 };
}

export function getPersonalBalance(
  userId: string,
  entries: BalanceEntry[],
  settlements: SettlementRecord[],
  memberIds: string[],
): { youOwe: number; youReceive: number } {
  const balances = computeUserBalances(entries, settlements, memberIds);
  const mine = balances.find((b) => b.userId === userId);
  if (!mine) return { youOwe: 0, youReceive: 0 };
  return {
    youOwe: mine.totalOwed,
    youReceive: mine.netBalance > 0 ? mine.netBalance : 0,
  };
}
