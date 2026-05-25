'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '@/hooks/use-chart-theme';
import { useCurrency } from '@/hooks/use-currency';

type ComparisonPoint = {
  month: string;
  spent: number;
  budget: number;
  label: string;
};

type CategoryBudgetPoint = {
  name: string;
  spent: number;
  budget: number;
  color?: string | null;
};

export function BudgetVsActualChart({ data }: { data: ComparisonPoint[] }) {
  const chart = useChartTheme();
  const { format } = useCurrency();

  if (!data.some((d) => d.spent > 0 || d.budget > 0)) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No budget comparison data yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
        <XAxis dataKey="label" tick={chart.tick} />
        <YAxis tick={chart.tick} />
        <Tooltip
          formatter={(v: number) => format(v)}
          contentStyle={chart.tooltipStyle}
        />
        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
        <Bar dataKey="spent" name="Actual" fill={chart.accent} radius={[4, 4, 0, 0]} />
        <Bar dataKey="budget" name="Budget" fill={chart.colors[1]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBudgetBreakdownChart({
  data,
}: {
  data: CategoryBudgetPoint[];
}) {
  const chart = useChartTheme();
  const { format } = useCurrency();

  const chartData = data.filter((d) => d.budget > 0 || d.spent > 0);
  if (!chartData.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No category budgets defined.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} horizontal={false} />
        <XAxis type="number" tick={chart.tick} />
        <YAxis type="category" dataKey="name" width={100} tick={chart.tick} />
        <Tooltip
          formatter={(v: number) => format(v)}
          contentStyle={chart.tooltipStyle}
        />
        <Legend />
        <Bar dataKey="spent" name="Spent" fill={chart.accent} radius={[0, 4, 4, 0]} />
        <Bar dataKey="budget" name="Budget" fill="#22c55e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
