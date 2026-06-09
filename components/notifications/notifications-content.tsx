'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Archive, Bell, CheckCheck, ExternalLink, Search, Trash2 } from 'lucide-react';
import type { Notification } from '@/lib/database.types';
import { bulkUpdateNotifications, deleteNotification, markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-states';
import { cn } from '@/lib/utils';
import { FilterField, FilterSheet } from '@/components/filters/filter-sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
];

function hrefFor(status: string, search: string, page = 1) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/notifications?${qs}` : '/notifications';
}

export function NotificationsContent({
  initialNotifications,
  total,
  page,
  limit,
  status,
  search,
  teamId,
  userId,
}: {
  initialNotifications: Notification[];
  total: number;
  page: number;
  limit: number;
  status: string;
  search: string;
  teamId: string;
  userId: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState(search);
  const [statusDraft, setStatusDraft] = useState(status);
  const [isPending, startTransition] = useTransition();
  const pages = Math.max(1, Math.ceil(total / limit));
  const selectedCount = selected.length;
  const allVisibleSelected = items.length > 0 && items.every((item) => selected.includes(item.id));

  useEffect(() => {
    setItems(initialNotifications);
    setSelected([]);
    setStatusDraft(status);
  }, [initialNotifications, status]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-inbox-${teamId}-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Notification | null;
          const oldRow = payload.old as Partial<Notification> | null;
          if (row && row.team_id !== teamId) return;
          if (payload.eventType === 'INSERT' && row) setItems((prev) => [row, ...prev.filter((n) => n.id !== row.id)]);
          if (payload.eventType === 'UPDATE' && row) setItems((prev) => prev.map((n) => (n.id === row.id ? row : n)));
          if (payload.eventType === 'DELETE' && oldRow?.id) setItems((prev) => prev.filter((n) => n.id !== oldRow.id));
        },
      )
      .subscribe((subscriptionStatus, error) => {
        if (error) {
          console.error('Notifications inbox realtime subscription failed', {
            teamId,
            userId,
            status: subscriptionStatus,
            error: error.message,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, userId]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (status === 'unread' && item.is_read) return false;
      if (status === 'read' && !item.is_read) return false;
      if (status !== 'archived' && item.archived_at) return false;
      if (status === 'archived' && !item.archived_at) return false;
      return true;
    });
  }, [items, status]);

  const submitSearch = () => router.push(hrefFor(status, query));

  const runBulk = (action: 'read' | 'archive' | 'delete') => {
    startTransition(async () => {
      const result = await bulkUpdateNotifications(selected, action);
      if (!result.error) {
        if (action === 'delete') setItems((prev) => prev.filter((item) => !selected.includes(item.id)));
        if (action === 'read') setItems((prev) => prev.map((item) => (selected.includes(item.id) ? { ...item, is_read: true, read: true, read_at: new Date().toISOString() } : item)));
        if (action === 'archive') setItems((prev) => prev.filter((item) => !selected.includes(item.id)));
        setSelected([]);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Actionable alerts and team updates.</p>
        </div>
        <Button
          onClick={() => startTransition(async () => {
            await markAllNotificationsRead();
            const now = new Date().toISOString();
            setItems((prev) => prev.map((item) => ({ ...item, is_read: true, read: true, read_at: now })));
          })}
          disabled={isPending}
        >
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterSheet
          activeCount={status !== 'all' ? 1 : 0}
          title="Notification filters"
          description="Filter inbox items by read and archive status."
          align="start"
          onReset={() => {
            setStatusDraft('all');
            router.push(hrefFor('all', search));
          }}
          onApply={() => router.push(hrefFor(statusDraft, query))}
        >
          <FilterField label="Status">
            <Select value={statusDraft} onValueChange={setStatusDraft}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterSheet>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitSearch();
            }}
            placeholder="Search notifications"
            className="w-full sm:w-72"
          />
          <Button variant="outline" size="icon" onClick={submitSearch} aria-label="Search notifications">
            <Search className="size-4" />
          </Button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <span className="mr-auto text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button size="sm" variant="outline" onClick={() => runBulk('read')} disabled={isPending}>
            <CheckCheck className="size-4" />
            Read
          </Button>
          <Button size="sm" variant="outline" onClick={() => runBulk('archive')} disabled={isPending}>
            <Archive className="size-4" />
            Archive
          </Button>
          <Button size="sm" variant="destructive" onClick={() => runBulk('delete')} disabled={isPending}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="size-5" />
            Inbox
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={(checked) => setSelected(checked ? visibleItems.map((item) => item.id) : [])}
              aria-label="Select all notifications"
            />
            <Badge variant="outline">{total} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {visibleItems.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="New alerts will appear here as work happens." />
          ) : (
            <div className="divide-y divide-border">
              {visibleItems.map((item) => (
                <div key={item.id} className={cn('flex gap-3 py-4', !item.is_read && 'bg-muted/20 px-2')}>
                  <Checkbox
                    checked={selected.includes(item.id)}
                    onCheckedChange={(checked) =>
                      setSelected((prev) => (checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                    }
                    aria-label={`Select ${item.title}`}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium leading-tight">{item.title}</h2>
                      {!item.is_read && <StatusBadge status="unread" />}
                      <Badge variant="secondary" className="capitalize">{item.type.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.message ?? item.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {item.link && (
                      <Button variant="outline" size="icon" asChild aria-label="Open notification">
                        <Link href={item.link}>
                          <ExternalLink className="size-4" />
                        </Link>
                      </Button>
                    )}
                    {!item.is_read && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => startTransition(async () => {
                          await markNotificationRead(item.id);
                          setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_read: true, read: true, read_at: new Date().toISOString() } : row)));
                        })}
                        aria-label="Mark as read"
                      >
                        <CheckCheck className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startTransition(async () => {
                        await deleteNotification(item.id);
                        setItems((prev) => prev.filter((row) => row.id !== item.id));
                      })}
                      aria-label="Delete notification"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
            {page > 1 ? <Link href={hrefFor(status, search, page - 1)}>Previous</Link> : <span>Previous</span>}
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} asChild={page < pages}>
            {page < pages ? <Link href={hrefFor(status, search, page + 1)}>Load more</Link> : <span>Load more</span>}
          </Button>
        </div>
      )}
    </div>
  );
}
