'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';

export function useChartTheme() {
  const { resolvedTheme } = useTheme();

  return useMemo(
    () => ({
      tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
      gridStroke: 'hsl(var(--border))',
      tooltipStyle: {
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        color: 'hsl(var(--popover-foreground))',
      },
      colors: [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
      ],
      accent: 'hsl(var(--accent))',
      resolvedTheme,
    }),
    [resolvedTheme]
  );
}
