'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BookOpen,
  CircleDollarSign,
  ClipboardCheck,
  CalendarClock,
  PiggyBank,
  Scale,
  Tag,
  Users,
} from 'lucide-react';
import type { ActivityLog } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-states';
import { FilterField, FilterSheet } from '@/components/filters/filter-sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ActivityRow = ActivityLog & {
  profiles?: { full_name: string | null; avatar_url?: string | null } | null;
};

const filters = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'budget', label: 'Budgets' },
  { value: 'team', label: 'Team' },
  { value: 'settlement', label: 'Settlements' },
  { value: 'approval', label: 'Approvals' },
  { value: 'recurring_expense', label: 'Recurring' },
] as const;

const iconMap = {
  expense: CircleDollarSign,
  budget: PiggyBank,
  team: Users,
  invite: Users,
  settlement: Scale,
  approval: ClipboardCheck,
  recurring_expense: CalendarClock,
  category: Tag,
} as const;

const colorMap: Record<string, string> = {
  expense: 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
  budget: 'text-yellow-600 bg-yellow-500/10 dark:text-yellow-400',
  team: 'text-green-600 bg-green-500/10 dark:text-green-400',
  invite: 'text-green-600 bg-green-500/10 dark:text-green-400',
  settlement: 'text-red-600 bg-red-500/10 dark:text-red-400',
  approval: 'text-violet-600 bg-violet-500/10 dark:text-violet-400',
  recurring_expense: 'text-cyan-600 bg-cyan-500/10 dark:text-cyan-400',
  category: 'text-primary bg-primary/10',
};

function activityHref(type: string, search: string, page = 1) {
  const params = new URLSearchParams();
  if (type !== 'all') params.set('type', type);
  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/activity?${qs}` : '/activity';
}

function actionStatus(actionType: string) {
  const action = actionType.toLowerCase();
  if (action.includes('rejected')) return 'rejected';
  if (action.includes('cancelled')) return 'cancelled';
  if (action.includes('canceled')) return 'canceled';
  if (action.includes('deleted')) return 'deleted';
  if (action.includes('updated')) return 'updated';
  if (action.includes('created') || action.includes('joined') || action.includes('accepted') || action.includes('approved') || action.includes('completed')) return 'success';
  return action.split('_').at(-1) ?? action;
}

export function ActivityContent({
  initialActivity,
  total,
  page,
  limit,
  activeType,
  search,
  teamId,
}: {
  initialActivity: ActivityRow[];
  total: number;
  page: number;
  limit: number;
  activeType: string;
  search: string;
  teamId: string;
}) {
  const router = useRouter();
  const [activity, setActivity] = useState(initialActivity);
  const [query, setQuery] = useState(search);
  const [typeDraft, setTypeDraft] = useState(activeType);
  const pages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setActivity(initialActivity);
    setTypeDraft(activeType);
  }, [initialActivity, activeType]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`activity-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const row = payload.new as ActivityLog;
          const matchesActiveType =
            activeType === 'all' ||
            row.entity_type === activeType ||
            (activeType === 'approval' &&
              ['expense_submitted', 'expense_approved', 'expense_rejected', 'expense_reimbursed', 'reimbursement_completed'].includes(row.action_type));
          if (!matchesActiveType) return;
          setActivity((prev) => [row, ...prev.filter((a) => a.id !== row.id)].slice(0, limit));
        },
      )
      .subscribe((status, error) => {
        if (error) {
          console.error('Activity realtime subscription failed', {
            teamId,
            status,
            error: error.message,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeType, limit, teamId]);

  const filteredActivity = useMemo(
    () =>
      activeType === 'all'
        ? activity
        : activity.filter((item) =>
            activeType === 'approval'
              ? ['expense_submitted', 'expense_approved', 'expense_rejected', 'expense_reimbursed', 'reimbursement_completed'].includes(item.action_type)
              : item.entity_type === activeType,
          ),
    [activity, activeType],
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time team audit trail and notification history.
          </p>
        </div>
        <Badge variant="outline">{total} events</Badge>
      </div>

      <div className="flex max-w-2xl flex-col gap-3 sm:flex-row">
        <form
          className="min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(activityHref(activeType, query));
          }}
        >
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search activity..."
            aria-label="Search activity"
          />
        </form>
        <FilterSheet
          activeCount={activeType !== 'all' ? 1 : 0}
          title="Activity filters"
          description="Filter the audit trail by event type."
          align="start"
          onReset={() => {
            setTypeDraft('all');
            router.push(activityHref('all', search));
          }}
          onApply={() => router.push(activityHref(typeDraft, query))}
        >
          <FilterField label="Event type">
            <Select value={typeDraft} onValueChange={setTypeDraft}>
              <SelectTrigger><SelectValue placeholder="Event type" /></SelectTrigger>
              <SelectContent>
                {filters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterSheet>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="size-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredActivity.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No activity yet"
              description="Important team actions will appear here as they happen."
            />
          ) : (
            <div className="divide-y divide-border">
              {filteredActivity.map((item, index) => {
                const Icon = iconMap[item.entity_type as keyof typeof iconMap] ?? Bell;
                return (
                  <div
                    key={item.id}
                    className="relative flex gap-3 px-4 py-4 transition-colors hover:bg-accent/10 dark:hover:bg-muted/50 sm:px-6"
                  >
                    {index !== filteredActivity.length - 1 && (
                      <span className="absolute left-[34px] top-12 h-[calc(100%-2.25rem)] w-px bg-border sm:left-[42px]" />
                    )}
                    <span
                      className={cn(
                        'z-10 flex size-9 shrink-0 items-center justify-center rounded-full',
                        colorMap[item.entity_type] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-tight">{item.description ?? item.message}</p>
                        <StatusBadge status={actionStatus(item.action_type)} />
                        <Badge variant="outline" className="h-6 rounded-md capitalize">
                          {item.entity_type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.profiles?.full_name ?? 'System'} ·{' '}
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
            {page > 1 ? (
              <Link href={activityHref(activeType, search, page - 1)}>Previous</Link>
            ) : (
              <span>Previous</span>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} asChild={page < pages}>
            {page < pages ? (
              <Link href={activityHref(activeType, search, page + 1)}>Next</Link>
            ) : (
              <span>Next</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
