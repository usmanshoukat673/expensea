'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BookOpen,
  CircleDollarSign,
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
import { EmptyState } from '@/components/ui/empty-states';

type ActivityRow = ActivityLog & {
  profiles?: { full_name: string | null; avatar_url?: string | null } | null;
};

const filters = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'budget', label: 'Budgets' },
  { value: 'team', label: 'Team' },
  { value: 'settlement', label: 'Settlements' },
  { value: 'category', label: 'Categories' },
] as const;

const iconMap = {
  expense: CircleDollarSign,
  budget: PiggyBank,
  team: Users,
  invite: Users,
  settlement: Scale,
  category: Tag,
} as const;

const colorMap: Record<string, string> = {
  expense: 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
  budget: 'text-yellow-600 bg-yellow-500/10 dark:text-yellow-400',
  team: 'text-green-600 bg-green-500/10 dark:text-green-400',
  invite: 'text-green-600 bg-green-500/10 dark:text-green-400',
  settlement: 'text-red-600 bg-red-500/10 dark:text-red-400',
  category: 'text-primary bg-primary/10',
};

export function ActivityContent({
  initialActivity,
  total,
  page,
  limit,
  activeType,
  teamId,
}: {
  initialActivity: ActivityRow[];
  total: number;
  page: number;
  limit: number;
  activeType: string;
  teamId: string;
}) {
  const [activity, setActivity] = useState(initialActivity);
  const pages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setActivity(initialActivity);
  }, [initialActivity]);

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
          if (activeType !== 'all' && row.entity_type !== activeType) return;
          setActivity((prev) => [row, ...prev.filter((a) => a.id !== row.id)].slice(0, limit));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeType, limit, teamId]);

  const filteredActivity = useMemo(
    () =>
      activeType === 'all'
        ? activity
        : activity.filter((item) => item.entity_type === activeType),
    [activity, activeType],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time team audit trail and notification history.
          </p>
        </div>
        <Badge variant="outline">{total} events</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={activeType === filter.value ? 'default' : 'outline'}
            size="sm"
            asChild
          >
            <Link href={filter.value === 'all' ? '/activity' : `/activity?type=${filter.value}`}>
              {filter.label}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="size-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivity.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No activity yet"
              description="Important team actions will appear here as they happen."
            />
          ) : (
            <div className="space-y-1">
              {filteredActivity.map((item, index) => {
                const Icon = iconMap[item.entity_type as keyof typeof iconMap] ?? Bell;
                return (
                  <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {index !== filteredActivity.length - 1 && (
                      <span className="absolute left-[18px] top-10 h-[calc(100%-2.5rem)] w-px bg-border" />
                    )}
                    <span
                      className={cn(
                        'z-10 flex size-9 shrink-0 items-center justify-center rounded-full',
                        colorMap[item.entity_type] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 border-b border-border pb-4 last:border-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-tight">{item.message}</p>
                        <Badge variant="secondary" className="capitalize">
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
              <Link href={`/activity?type=${activeType}&page=${page - 1}`}>Previous</Link>
            ) : (
              <span>Previous</span>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} asChild={page < pages}>
            {page < pages ? (
              <Link href={`/activity?type=${activeType}&page=${page + 1}`}>Next</Link>
            ) : (
              <span>Next</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
