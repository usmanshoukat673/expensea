import { requireTeam, canEdit } from '@/lib/auth/session';
import { getBalanceContext } from '@/lib/data/settlements';
import { getDashboardData } from '@/lib/data/dashboard';
import { SettlementsContent } from '@/components/settlements/settlements-content';
import { getDateRange } from '@/lib/date-ranges';

export const metadata = { title: 'Settlements' };

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams?: Promise<{ dateRange?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = getDateRange(params?.dateRange, params?.from, params?.to);
  const session = await requireTeam();
  const [balance, { members }] = await Promise.all([
    getBalanceContext(session.teamId, session.user.id, range),
    getDashboardData(session.teamId, range),
  ]);

  const memberList = members.map((m) => ({
    userId: m.user_id,
    name: m.profiles?.full_name ?? m.profiles?.email ?? 'Member',
  }));

  return (
    <SettlementsContent
      settlements={balance.settlements}
      pendingSettlements={balance.pendingSettlements}
      recentCompleted={balance.recentCompleted}
      userBalances={balance.userBalances}
      debtEdges={balance.debtSummary.edges}
      pendingTotal={balance.pendingTotal}
      personal={balance.personal}
      members={memberList}
      canEdit={canEdit(session.role)}
      dateRange={range}
    />
  );
}
