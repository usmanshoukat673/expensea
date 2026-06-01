'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { format as formatDate, parseISO, startOfMonth } from 'date-fns';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import { useChartTheme } from '@/hooks/use-chart-theme';
import { EmptyState } from '@/components/ui/empty-states';
import type { ExpenseCategory } from '@/lib/database.types';
import { getCategoryIcon } from '@/lib/categories/icons';
import { AnalyticsBudgetSection } from '@/components/analytics/analytics-budget-section';
import type { BudgetWithUsage } from '@/lib/budget/engine';
import type { DateRangeValue } from '@/lib/date-ranges';
import { DateRangeFilter } from '@/components/filters/date-range-filter';

const ExpensesByCategoryChart = dynamic(
  () => import('@/components/charts/category-charts').then((m) => m.ExpensesByCategoryChart),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-lg" /> },
);

const MonthlyCategoryChart = dynamic(
  () => import('@/components/charts/category-charts').then((m) => m.MonthlyCategoryChart),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-lg" /> },
);

const TopCategoriesList = dynamic(
  () => import('@/components/charts/category-charts').then((m) => m.TopCategoriesList),
  { ssr: false, loading: () => <Skeleton className="h-[160px] w-full rounded-lg" /> },
);

type Entry = {
  amount: number;
  lunch_date: string;
  payment_status: string;
  user_id: string;
  category_id?: string | null;
  expense_categories?: { id: string; name: string; icon: string; color: string } | null;
};

export function AnalyticsContent({
  entries,
  categories,
  budgetComparison = [],
  budgetCategoryBreakdown = [],
  hasMonthlyBudget = false,
  dateRange,
}: {
  entries: Entry[];
  categories: ExpenseCategory[];
  dateRange: DateRangeValue;
  budgetComparison?: { month: string; spent: number; budget: number; label: string }[];
  budgetCategoryBreakdown?: BudgetWithUsage[];
  hasMonthlyBudget?: boolean;
}) {
  const { format } = useCurrency();
  const chart = useChartTheme();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (!selectedCategories.length) return entries;
    return entries.filter(
      (e) => e.category_id && selectedCategories.includes(e.category_id),
    );
  }, [entries, selectedCategories]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => {
      const key = formatDate(startOfMonth(parseISO(e.lunch_date)), 'MMM yyyy');
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    });
    return Array.from(map.entries()).map(([month, total]) => ({ month, total }));
  }, [filtered]);

  const statusData = useMemo(() => {
    const paid = filtered.filter((e) => e.payment_status === 'paid').reduce((s, e) => s + Number(e.amount), 0);
    const unpaid = filtered.filter((e) => e.payment_status === 'unpaid').reduce((s, e) => s + Number(e.amount), 0);
    return [
      { name: 'Paid', value: paid },
      { name: 'Unpaid', value: unpaid },
    ].filter((d) => d.value > 0);
  }, [filtered]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 sm:max-w-[min(100%,22rem)] lg:max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spending trends and category breakdown for {dateRange.label}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:shrink-0 sm:items-end">
          <DateRangeFilter range={dateRange} singleRow />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            const active = selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Badge
                  variant={active ? 'default' : 'outline'}
                  className="cursor-pointer gap-1.5"
                >
                  <Icon className="size-3 shrink-0" style={{ color: cat.color }} />
                  {cat.name}
                </Badge>
              </button>
            );
          })}
          {selectedCategories.length > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => setSelectedCategories([])}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total spending</CardDescription>
            <CardTitle className="text-2xl">{format(total)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total entries</CardDescription>
            <CardTitle className="text-2xl">{filtered.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg per entry</CardDescription>
            <CardTitle className="text-2xl">
              {filtered.length ? format(total / filtered.length) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly spending</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] min-w-0 overflow-hidden">
            {monthlyData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                  <XAxis dataKey="month" tick={chart.tick} tickLine={false} axisLine={false} />
                  <YAxis tick={chart.tick} tickLine={false} axisLine={false} width={48} />
                  <Tooltip formatter={(v: number) => format(v)} contentStyle={chart.tooltipStyle} />
                  <Bar dataKey="total" fill={chart.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} title="No data" description="Add expenses to see trends." actionHref="/entries" actionLabel="View entries" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] min-w-0 overflow-hidden">
            {filtered.length ? <ExpensesByCategoryChart entries={filtered} /> : (
              <EmptyState icon={BarChart3} title="No data" description="Categorize expenses to unlock this chart." actionHref="/categories" actionLabel="Categories" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly by category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] min-w-0 overflow-hidden">
            {filtered.length ? <MonthlyCategoryChart entries={filtered} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top categories</CardTitle>
          </CardHeader>
          <CardContent>
            <TopCategoriesList entries={filtered} />
          </CardContent>
        </Card>
      </div>

      <AnalyticsBudgetSection
        comparison={budgetComparison}
        categoryBreakdown={budgetCategoryBreakdown}
        hasMonthlyBudget={hasMonthlyBudget}
        rangeLabel={dateRange.label}
      />

      <Card>
        <CardHeader>
          <CardTitle>Payment status</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] min-w-0 overflow-hidden">
          {statusData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  outerRadius={82}
                  labelLine={false}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={chart.colors[i % chart.colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => format(v)} contentStyle={chart.tooltipStyle} />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No data" description="Add expenses first." actionHref="/entries" actionLabel="View entries" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
