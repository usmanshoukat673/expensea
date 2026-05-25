'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PiggyBank, TrendingDown, Wallet, Percent } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/use-currency';
import type { DashboardBudgetSummary } from '@/lib/budget/engine';
import { BudgetProgress } from '@/components/budgets/budget-progress';

export function DashboardBudgetWidgets({
  summary,
}: {
  summary: DashboardBudgetSummary;
}) {
  const { format } = useCurrency();

  if (!summary.hasBudget) {
    return (
      <Card className="hover-lift soft-shadow">
        <CardHeader className="pb-2">
          <CardDescription>Team budget</CardDescription>
          <CardTitle className="text-lg">No budget set</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Define monthly or category budgets to track spending.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/budgets">
              <PiggyBank className="size-4" />
              Set up budgets
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      title: 'Total budget',
      value: format(summary.totalBudget),
      sub: 'This month',
      icon: PiggyBank,
    },
    {
      title: 'Spent so far',
      value: format(summary.totalSpent),
      sub: `${summary.utilization}% utilized`,
      icon: TrendingDown,
      className:
        summary.status === 'over'
          ? 'text-destructive'
          : summary.status === 'warning'
            ? 'text-amber-600 dark:text-amber-400'
            : undefined,
    },
    {
      title: 'Remaining',
      value: format(summary.remaining),
      sub: summary.status === 'over' ? 'Over limit' : 'Available',
      icon: Wallet,
      className:
        summary.remaining > 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-destructive',
    },
    {
      title: 'Utilization',
      value: `${summary.utilization}%`,
      sub: 'Of monthly limit',
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Budget overview</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/budgets">Manage</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover-lift soft-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="size-4 shrink-0 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.className ?? ''}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground">{stat.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Monthly utilization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <BudgetProgress
            utilization={summary.utilization}
            status={summary.status}
          />
          <p className="text-xs text-muted-foreground">
            {format(summary.totalSpent)} of {format(summary.totalBudget)} spent
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
