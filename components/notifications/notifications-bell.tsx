'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Circle, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications';
import type { Notification } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const typeStyles: Record<string, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-green-600 dark:text-green-400' },
  warning: { icon: AlertTriangle, className: 'text-yellow-600 dark:text-yellow-400' },
  error: { icon: XCircle, className: 'text-red-600 dark:text-red-400' },
  info: { icon: Info, className: 'text-blue-600 dark:text-blue-400' },
};

export function NotificationsBell({
  initialNotifications,
  teamId,
  userId,
}: {
  initialNotifications: Notification[];
  teamId: string;
  userId: string;
}) {
  const [items, setItems] = useState(initialNotifications);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const channelId = useId().replace(/:/g, '');
  const unread = items.filter((n) => n.team_id === teamId && n.user_id === userId && !n.read_at).length;
  const orderedItems = useMemo(
    () =>
      [...items]
        .filter((n) => n.team_id === teamId && n.user_id === userId)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 8),
    [items, teamId, userId],
  );

  useEffect(() => {
    setItems(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${teamId}-${userId}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Notification | null;
          const oldRow = payload.old as Partial<Notification> | null;
          if (row && row.team_id !== teamId) return;
          if (payload.eventType === 'INSERT' && row) {
            setItems((prev) => [row, ...prev.filter((n) => n.id !== row.id)].slice(0, 12));
          } else if (payload.eventType === 'UPDATE' && row) {
            setItems((prev) => prev.map((n) => (n.id === row.id ? row : n)));
          } else if (payload.eventType === 'DELETE' && oldRow?.id) {
            setItems((prev) => prev.filter((n) => n.id !== oldRow.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, teamId, userId]);

  const markRead = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      );
    });
  };

  const markAllRead = () => {
    setLoading(true);
    startTransition(async () => {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((n) =>
          n.team_id === teamId && n.user_id === userId ? { ...n, read_at: now, read: true } : n,
        ),
      );
      setLoading(false);
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 hover:translate-y-0 active:scale-100"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]">
              {unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={unread === 0}
            onClick={markAllRead}
          >
            <CheckCheck className="size-3.5" />
            Mark all
          </Button>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : orderedItems.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No notifications</p>
          ) : (
            orderedItems.map((n) => {
              const style = typeStyles[n.type] ?? typeStyles.info;
              const Icon = style.icon;
              return (
              <button
                key={n.id}
                type="button"
                className={cn(
                  'w-full border-b border-border px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/50',
                  !n.read_at && 'bg-muted/30',
                )}
                onClick={() => !n.read_at && markRead(n.id)}
              >
                <div className="flex gap-2">
                  <Icon className={cn('mt-0.5 size-4 shrink-0', style.className)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {!n.read_at && <Circle className="size-2 fill-current text-accent" />}
                      <p className="truncate text-sm font-medium">{n.title}</p>
                    </div>
                    {(n.message ?? n.body) && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message ?? n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            )})
          )}
        </div>
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/activity">View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
