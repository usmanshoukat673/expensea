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
    <div className="h-[220px] min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="46%"
            outerRadius={72}
            labelLine={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color || chart.colors[i % chart.colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={chart.tooltipStyle} />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ color: 'hsl(var(--foreground))', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
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
    <div className="h-[220px] min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
          <XAxis dataKey="month" tick={chart.tick} tickLine={false} axisLine={false} />
          <YAxis tick={chart.tick} tickLine={false} axisLine={false} width={48} />
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={chart.tooltipStyle} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="a" fill={chart.colors[i % chart.colors.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
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
        <div key={row.name} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            <span className="truncate">{row.name}</span>
          </span>
          <span className="shrink-0 font-semibold">{fmt(row.total)}</span>
        </div>
      ))}
    </div>
  );
}
