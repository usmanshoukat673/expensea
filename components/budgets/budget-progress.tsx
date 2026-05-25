'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  statusProgressColor,
  type BudgetStatus,
} from '@/lib/budget/engine';

export function BudgetProgress({
  utilization,
  status,
  className,
}: {
  utilization: number;
  status: BudgetStatus;
  className?: string;
}) {
  const capped = Math.min(utilization, 100);

  return (
    <Progress
      value={capped}
      className={cn('h-2 transition-all duration-500', className)}
      indicatorClassName={statusProgressColor(status)}
    />
  );
}
