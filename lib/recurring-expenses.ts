import { addDays, addMonths, addWeeks, addYears, format, parseISO } from 'date-fns';
import type { RecurringFrequency } from '@/lib/database.types';

export function calculateNextRunDate(
  date: string,
  frequency: RecurringFrequency,
  intervalValue: number,
) {
  const parsed = parseISO(date);
  const interval = Math.max(1, intervalValue);
  const next =
    frequency === 'daily'
      ? addDays(parsed, interval)
      : frequency === 'weekly'
        ? addWeeks(parsed, interval)
        : frequency === 'monthly'
          ? addMonths(parsed, interval)
          : addYears(parsed, interval);

  return format(next, 'yyyy-MM-dd');
}

export function describeRecurringInterval(
  frequency: RecurringFrequency,
  intervalValue: number,
) {
  const units: Record<RecurringFrequency, string> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    yearly: 'year',
  };
  const unit = units[frequency];
  if (intervalValue === 1) return frequency[0].toUpperCase() + frequency.slice(1);
  return `Every ${intervalValue} ${unit}s`;
}
