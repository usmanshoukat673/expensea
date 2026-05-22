import { formatCurrencyAmount } from '@/lib/currency';

/**
 * Format amount using team/workspace currency code (server-safe).
 */
export function formatCurrency(amount: number, currencyCode?: string | null): string {
  return formatCurrencyAmount(amount, currencyCode);
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return new Date(date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: new Date(date).getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format date as readable string
 */
export function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
  const options: Intl.DateTimeFormatOptions = format === 'short'
    ? { month: 'short', day: 'numeric', year: '2-digit' }
    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  
  return new Date(date).toLocaleDateString('en-IN', options);
}

/**
 * Calculate balance split between participants
 */
export function calculateSplit(amount: number, participants: number): number {
  return Math.round((amount / participants) * 100) / 100;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Group entries by date
 */
export function groupByDate<T extends { date: Date }>(
  items: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  items.forEach(item => {
    const dateKey = formatDate(item.date);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(item);
  });
  
  return grouped;
}

/**
 * Calculate total amount from entries
 */
export function calculateTotal<T extends { amount: number }>(items: T[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate text
 */
export function truncate(text: string, length = 50): string {
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

/**
 * Get color for category
 */
export function getCategoryColor(
  category: 'Food' | 'Transport' | 'Entertainment' | 'Beverages' | 'Other'
): string {
  const colors: Record<string, string> = {
    Food: '#ef4444',
    Transport: '#3b82f6',
    Entertainment: '#8b5cf6',
    Beverages: '#ec4899',
    Other: '#6b7280',
  };
  return colors[category] || colors.Other;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
