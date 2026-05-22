'use client';

import { useMemo } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
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
import { useChartTheme } from '@/hooks/use-chart-theme';
import { useCurrency } from '@/hooks/use-currency';

type Entry = {
  amount: number;
  lunch_date: string;
  category_id?: string | null;
  expense_categories?: { id: string; name: string; color: string } | null;
};

export function ExpensesByCategoryChart({ entries }: { entries: Entry[] }) {
  const chart = useChartTheme();
  const { format: fmt } = useCurrency();

  const data = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    entries.forEach((e) => {
      const name = e.expense_categories?.name ?? 'Uncategorized';
      const color = e.expense_categories?.color ?? '#64748b';
      const key = e.category_id ?? 'none';
      const cur = map.get(key) ?? { name, value: 0, color };
      cur.value += Number(e.amount);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [entries]);

  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color || chart.colors[i % chart.colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={chart.tooltipStyle} />
        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyCategoryChart({ entries }: { entries: Entry[] }) {
  const chart = useChartTheme();
  const { format: fmt } = useCurrency();

  const { data, keys } = useMemo(() => {
    const months = new Map<string, Record<string, number>>();
    const cats = new Set<string>();
    entries.forEach((e) => {
      const month = format(startOfMonth(parseISO(e.lunch_date)), 'MMM yy');
      const cat = e.expense_categories?.name ?? 'Other';
      cats.add(cat);
      const row = months.get(month) ?? {};
      row[cat] = (row[cat] ?? 0) + Number(e.amount);
      months.set(month, row);
    });
    const keysArr = Array.from(cats);
    const dataArr = Array.from(months.entries()).map(([month, vals]) => ({
      month,
      ...vals,
    }));
    return { data: dataArr, keys: keysArr };
  }, [entries]);

  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
        <XAxis dataKey="month" tick={chart.tick} />
        <YAxis tick={chart.tick} />
        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={chart.tooltipStyle} />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId="a" fill={chart.colors[i % chart.colors.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopCategoriesList({ entries }: { entries: Entry[] }) {
  const { format: fmt } = useCurrency();
  const top = useMemo(() => {
    const map = new Map<string, { name: string; total: number; color: string }>();
    entries.forEach((e) => {
      const name = e.expense_categories?.name ?? 'Uncategorized';
      const color = e.expense_categories?.color ?? '#64748b';
      const cur = map.get(name) ?? { name, total: 0, color };
      cur.total += Number(e.amount);
      map.set(name, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [entries]);

  if (!top.length) return <p className="text-sm text-muted-foreground">No category data</p>;

  return (
    <div className="space-y-3">
      {top.map((row) => (
        <div key={row.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
            {row.name}
          </span>
          <span className="font-semibold">{fmt(row.total)}</span>
        </div>
      ))}
    </div>
  );
}
