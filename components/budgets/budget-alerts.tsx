'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { BudgetWithUsage, DashboardBudgetSummary } from '@/lib/budget/engine';

export function BudgetAlertBanner({
  summary,
}: {
  summary: DashboardBudgetSummary;
}) {
  if (!summary.hasBudget) return null;

  if (summary.alertLevel === 'exceeded') {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Budget exceeded</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>
            Team spending is at {summary.utilization}% of the monthly budget.
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/budgets">Manage budgets</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (summary.alertLevel === 'warning80') {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">
          Budget warning
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>
            {summary.utilization}% of budget used — approaching your limit.
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/budgets">View budgets</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function BudgetAlertToasts({ budgets }: { budgets: BudgetWithUsage[] }) {
  const shown = useRef<Set<string>>(new Set());

  useEffect(() => {
    budgets.forEach((b) => {
      const key = `${b.id}-${b.alertLevel}`;
      if (b.alertLevel === 'none' || shown.current.has(key)) return;
      shown.current.add(key);
      const label =
        b.type === 'category'
          ? b.categoryName ?? 'Category budget'
          : 'Monthly team budget';

      if (b.alertLevel === 'exceeded') {
        toast.error(`${label} exceeded`, {
          description: `Spent ${b.utilization}% of ${Number(b.amount)} limit.`,
        });
      } else if (b.alertLevel === 'warning80') {
        toast.warning(`${label} at ${b.utilization}%`, {
          description: 'Approaching budget limit.',
        });
      }
    });
  }, [budgets]);

  return null;
}
