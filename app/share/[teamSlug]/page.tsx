import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicTeamBySlug } from '@/lib/data/dashboard';
import { PublicPageShell } from '@/components/public/public-page-shell';
import { PublicTeamView } from '@/components/public/public-team-view';

type Props = { params: Promise<{ teamSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamSlug } = await params;
  const data = await getPublicTeamBySlug(teamSlug);
  if (!data) return { title: 'Not found' };
  return {
    title: `${data.team.name} — Expense Summary`,
    description: `Public expense summary for ${data.team.name}`,
    openGraph: {
      title: `${data.team.name} | Expensea`,
      description: 'Smarter Expense Tracking for Teams',
    },
  };
}

export default async function PublicTeamPage({ params }: Props) {
  const { teamSlug } = await params;
  const data = await getPublicTeamBySlug(teamSlug);
  if (!data) notFound();

  return (
    <PublicPageShell
      title={data.team.name}
      subtitle="Read-only team expense summary"
      currencyCode={data.team.currency}
    >
      <PublicTeamView
        teamName={data.team.name}
        brandName={data.team.brand_name}
        logoUrl={data.team.logo_url}
        currencyCode={data.team.currency}
        total={data.total}
        pending={data.pending}
        currentMonthSpend={data.currentMonthSpend}
        lastMonthSpend={data.lastMonthSpend}
        monthlyDifferencePercent={data.monthlyDifferencePercent}
        settlementCount={data.settlementCount}
        members={data.members}
        entries={data.entries}
        analyticsEntries={data.analyticsEntries}
        showCategoryAnalytics={data.team.show_category_analytics_on_public !== false}
        showBalances={!!data.team.show_balances_on_public}
        balanceEdges={data.debtEdges}
        outstandingSettlements={data.outstandingSettlements}
        leaderboard={data.leaderboard}
      />
    </PublicPageShell>
  );
}
