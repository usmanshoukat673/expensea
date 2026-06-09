'use client';

import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { useCurrency } from '@/hooks/use-currency';
import { EmptyState } from '@/components/ui/empty-states';
import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryIcon } from '@/lib/categories/icons';
import type { DebtEdge } from '@/lib/balance/engine';

const PublicSpendingChart = dynamic(
  () => import('@/components/charts/public-spending-chart').then((m) => m.PublicSpendingChart),
  { ssr: false, loading: () => <Skeleton className="h-[240px] w-full rounded-lg" /> },
);

const ExpensesByCategoryChart = dynamic(
  () => import('@/components/charts/category-charts').then((m) => m.ExpensesByCategoryChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full rounded-lg" /> },
);

type Entry = {
  amount: number;
  lunch_date: string;
  payment_status: string;
  category_id?: string | null;
  expense_categories?: { id: string; name: string; icon: string; color: string } | null;
};

export function PublicTeamView({
  teamName,
  total,
  pending,
  memberCount,
  entries,
  showCategoryAnalytics = true,
  balanceEdges = [],
  showBalances = false,
}: {
  teamName: string;
  total: number;
  pending: number;
  memberCount: number;
  entries: Entry[];
  showCategoryAnalytics?: boolean;
  balanceEdges?: DebtEdge[];
  showBalances?: boolean;
}) {
  const { format: fmt } = useCurrency();

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total logged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(total)}</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(pending)}</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{memberCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending overview</CardTitle>
        </CardHeader>
        <CardContent>
          <PublicSpendingChart entries={entries} />
        </CardContent>
      </Card>

      {showCategoryAnalytics && entries.some((e) => e.expense_categories) && (
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpensesByCategoryChart entries={entries} />
          </CardContent>
        </Card>
      )}

      {showBalances && balanceEdges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {balanceEdges.map((e, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-border last:border-0">
                <span>Member owes member</span>
                <span className="font-medium">{fmt(e.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent entries — {teamName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No public entries"
              description="This team has not shared any expense records yet."
            />
          ) : (
            entries.slice(0, 15).map((e, i) => {
              const cat = e.expense_categories;
              const Icon = cat ? getCategoryIcon(cat.icon) : null;
              return (
                <div
                  key={i}
                  className="flex justify-between py-2 border-b border-border last:border-0 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {format(new Date(e.lunch_date), 'dd MMM yyyy')}
                    {cat && Icon && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Icon className="w-3 h-3" style={{ color: cat.color }} />
                        {cat.name}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={e.payment_status} />
                    <span className="font-medium">{fmt(Number(e.amount))}</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}
