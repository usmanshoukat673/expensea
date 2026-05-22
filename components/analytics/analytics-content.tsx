'use client';

import { useMemo } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { useChartTheme } from '@/hooks/use-chart-theme';
import { EmptyState } from '@/components/ui/empty-states';
import { BarChart3 } from 'lucide-react';

type Entry = { amount: number; lunch_date: string; payment_status: string; user_id: string };

export function AnalyticsContent({
  entries,
}: {
  entries: Entry[];
}) {
  const { format } = useCurrency();
  const chart = useChartTheme();

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const key = format(startOfMonth(parseISO(e.lunch_date)), 'MMM yyyy');
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    });
    return Array.from(map.entries()).map(([month, total]) => ({ month, total }));
  }, [entries]);

  const statusData = useMemo(() => {
    const paid = entries.filter((e) => e.payment_status === 'paid').reduce((s, e) => s + Number(e.amount), 0);
    const unpaid = entries.filter((e) => e.payment_status === 'unpaid').reduce((s, e) => s + Number(e.amount), 0);
    return [
      { name: 'Paid', value: paid },
      { name: 'Unpaid', value: unpaid },
    ].filter((d) => d.value > 0);
  }, [entries]);

  const total = entries.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Spending trends and payment breakdown</p>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>6-month spend</CardDescription>
            <CardTitle className="text-2xl">{format(total)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total entries</CardDescription>
            <CardTitle className="text-2xl">{entries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg per entry</CardDescription>
            <CardTitle className="text-2xl">
              {entries.length ? format(total / entries.length) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly spending</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {monthlyData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                  <XAxis dataKey="month" tick={chart.tick} />
                  <YAxis tick={chart.tick} />
                  <Tooltip
                    formatter={(v: number) => format(v)}
                    contentStyle={chart.tooltipStyle}
                  />
                  <Bar dataKey="total" fill={chart.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No analytics data yet"
                description="Add expenses to unlock spending trends and charts."
                actionLabel="View entries"
                actionHref="/entries"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={chart.colors[i % chart.colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => format(v)}
                    contentStyle={chart.tooltipStyle}
                  />
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No analytics data yet"
                description="Add expenses to unlock spending trends and charts."
                actionLabel="View entries"
                actionHref="/entries"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
