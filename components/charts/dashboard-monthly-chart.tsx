'use client';

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfMonth } from 'date-fns';
import { useCurrency } from '@/hooks/use-currency';
import { useChartTheme } from '@/hooks/use-chart-theme';

type Entry = { amount: number; lunch_date: string };

export function DashboardMonthlyChart({ entries }: { entries: Entry[] }) {
  const { format } = useCurrency();
  const chart = useChartTheme();

  const data = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const key = format(startOfMonth(parseISO(e.lunch_date)), 'MMM');
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    });
    return Array.from(map.entries()).map(([month, total]) => ({ month, total }));
  }, [entries]);

  if (!data.length) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">Add entries to see trends</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fillAccent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.accent} stopOpacity={0.4} />
            <stop offset="100%" stopColor={chart.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
        <XAxis dataKey="month" tick={chart.tick} />
        <YAxis tick={chart.tick} />
        <Tooltip formatter={(v: number) => format(v)} contentStyle={chart.tooltipStyle} />
        <Area
          type="monotone"
          dataKey="total"
          stroke={chart.accent}
          fill="url(#fillAccent)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
