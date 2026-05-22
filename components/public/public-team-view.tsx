'use client';

import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { useCurrency } from '@/hooks/use-currency';
import { EmptyState } from '@/components/ui/empty-states';
import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const PublicSpendingChart = dynamic(
  () => import('@/components/charts/public-spending-chart').then((m) => m.PublicSpendingChart),
  { ssr: false, loading: () => <Skeleton className="h-[240px] w-full rounded-lg" /> }
);

type Entry = { amount: number; lunch_date: string; payment_status: string };

export function PublicTeamView({
  teamName,
  total,
  pending,
  memberCount,
  entries,
}: {
  teamName: string;
  total: number;
  pending: number;
  memberCount: number;
  entries: Entry[];
}) {
  const { format } = useCurrency();

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total logged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{format(total)}</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{format(pending)}</p>
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
            entries.slice(0, 15).map((e, i) => (
              <div
                key={i}
                className="flex justify-between py-2 border-b border-border last:border-0 text-sm"
              >
                <span>{format(new Date(e.lunch_date), 'dd MMM yyyy')}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{e.payment_status}</Badge>
                  <span className="font-medium">{format(Number(e.amount))}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
