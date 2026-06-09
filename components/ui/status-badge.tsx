import * as React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock3,
  Info,
  PauseCircle,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

type StatusMeta = {
  tone: StatusTone;
  label?: string;
};

const STATUS_META: Record<string, StatusMeta> = {
  accepted: { tone: 'success', label: 'Accepted' },
  active: { tone: 'success', label: 'Active' },
  approved: { tone: 'success', label: 'Approved' },
  completed: { tone: 'success', label: 'Completed' },
  fully_reimbursed: { tone: 'success', label: 'Fully reimbursed' },
  healthy: { tone: 'success', label: 'Healthy' },
  on_track: { tone: 'success', label: 'On track' },
  paid: { tone: 'success', label: 'Paid' },
  reimbursed: { tone: 'success', label: 'Reimbursed' },
  safe: { tone: 'success', label: 'On track' },

  awaiting_approval: { tone: 'warning', label: 'Awaiting approval' },
  near: { tone: 'warning', label: 'Near limit' },
  near_limit: { tone: 'warning', label: 'Near limit' },
  partially_reimbursed: { tone: 'warning', label: 'Partially reimbursed' },
  pending: { tone: 'warning', label: 'Pending' },
  pending_approval: { tone: 'warning', label: 'Pending approval' },
  scheduled: { tone: 'warning', label: 'Scheduled' },
  unpaid: { tone: 'warning', label: 'Unpaid' },
  warning: { tone: 'warning', label: 'Near limit' },

  cancelled: { tone: 'error', label: 'Cancelled' },
  canceled: { tone: 'error', label: 'Canceled' },
  expired: { tone: 'error', label: 'Expired' },
  failed: { tone: 'error', label: 'Failed' },
  over: { tone: 'error', label: 'Over budget' },
  over_budget: { tone: 'error', label: 'Over budget' },
  rejected: { tone: 'error', label: 'Rejected' },

  draft: { tone: 'info', label: 'Draft' },
  new: { tone: 'info', label: 'New' },
  processing: { tone: 'info', label: 'Processing' },
  review: { tone: 'info', label: 'Review' },
  unread: { tone: 'info', label: 'Unread' },

  archived: { tone: 'neutral', label: 'Archived' },
  disabled: { tone: 'neutral', label: 'Disabled' },
  inactive: { tone: 'neutral', label: 'Inactive' },
  not_reimbursed: { tone: 'neutral', label: 'Not reimbursed' },
  paused: { tone: 'neutral', label: 'Paused' },
  read: { tone: 'neutral', label: 'Read' },
  revoked: { tone: 'neutral', label: 'Revoked' },
  suspended: { tone: 'neutral', label: 'Suspended' },
};

const toneClasses: Record<StatusTone, string> = {
  success:
    'border-green-600/25 bg-green-50 text-green-700 dark:border-green-400/25 dark:bg-green-400/10 dark:text-green-300',
  warning:
    'border-amber-600/25 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300',
  error:
    'border-destructive/30 bg-destructive/10 text-destructive dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-300',
  info:
    'border-blue-600/25 bg-blue-50 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300',
  neutral:
    'border-border bg-muted/60 text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground',
};

const toneIcons: Record<StatusTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: Clock3,
  error: XCircle,
  info: Info,
  neutral: Circle,
};

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function fallbackLabel(status: string) {
  return normalizeStatus(status)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export type StatusBadgeProps = Omit<React.ComponentProps<typeof Badge>, 'variant'> & {
  status: string;
  label?: React.ReactNode;
  showIcon?: boolean;
  tone?: StatusTone;
};

export function getStatusTone(status: string): StatusTone {
  return STATUS_META[normalizeStatus(status)]?.tone ?? 'neutral';
}

export function getStatusLabel(status: string) {
  const key = normalizeStatus(status);
  return STATUS_META[key]?.label ?? fallbackLabel(status);
}

export function StatusBadge({
  status,
  label,
  showIcon = true,
  tone,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const key = normalizeStatus(status);
  const resolvedTone = tone ?? STATUS_META[key]?.tone ?? 'neutral';
  const Icon =
    key === 'paused'
      ? PauseCircle
      : toneIcons[resolvedTone];

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-6 gap-1.5 rounded-md px-2 text-[11px] font-semibold leading-none capitalize',
        toneClasses[resolvedTone],
        className,
      )}
      {...props}
    >
      {showIcon && <Icon className="size-3" aria-hidden="true" />}
      {children ?? label ?? getStatusLabel(status)}
    </Badge>
  );
}
