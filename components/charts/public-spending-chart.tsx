'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format as formatDate, parseISO, startOfMonth } from 'date-fns';
import { useCurrency } from '@/hooks/use-currency';
import { useChartTheme } from '@/hooks/use-chart-theme';

export function PublicSpendingChart({
  entries,
}: {
  entries: { amount: number; lunch_date: string }[];
}) {
  const { format } = useCurrency();
  const chart = useChartTheme();

  const data = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const key = formatDate(startOfMonth(parseISO(e.lunch_date)), 'MMM');
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    });
    return Array.from(map.entries()).map(([month, total]) => ({ month, total }));
  }, [entries]);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No chart data</p>;
  }

  return (
    <div className="h-[240px] min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
          <XAxis dataKey="month" tick={chart.tick} tickLine={false} axisLine={false} />
          <YAxis tick={chart.tick} tickLine={false} axisLine={false} width={48} />
          <Tooltip formatter={(v: number) => format(v)} contentStyle={chart.tooltipStyle} />
          <Bar dataKey="total" fill={chart.colors[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
