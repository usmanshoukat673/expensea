'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PiggyBank } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { BudgetWithUsage } from '@/lib/budget/engine';

const BudgetVsActualChart = dynamic(
  () =>
    import('@/components/charts/budget-charts').then((m) => m.BudgetVsActualChart),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-lg" /> },
);

const CategoryBudgetBreakdownChart = dynamic(
  () =>
    import('@/components/charts/budget-charts').then(
      (m) => m.CategoryBudgetBreakdownChart,
    ),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-lg" /> },
);

export function AnalyticsBudgetSection({
  comparison,
  categoryBreakdown,
  hasMonthlyBudget,
}: {
  comparison: { month: string; spent: number; budget: number; label: string }[];
  categoryBreakdown: BudgetWithUsage[];
  hasMonthlyBudget: boolean;
}) {
  const categoryChartData = categoryBreakdown.map((b) => ({
    name: b.categoryName ?? 'Category',
    spent: b.spent,
    budget: Number(b.amount),
    color: b.categoryColor,
  }));

  const hasAnyBudget = hasMonthlyBudget || categoryBreakdown.length > 0;

  if (!hasAnyBudget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-accent" />
            Budget analytics
          </CardTitle>
          <CardDescription>
            Create team or category budgets to compare planned vs actual spending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link href="/budgets">Set up budgets</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Budget vs actual</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/budgets">Manage budgets</Link>
        </Button>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly comparison</CardTitle>
            <CardDescription>
              Actual spending vs monthly team budget (last 6 months)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetVsActualChart data={comparison} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category budget breakdown</CardTitle>
            <CardDescription>Current month limits vs spent</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBudgetBreakdownChart data={categoryChartData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
