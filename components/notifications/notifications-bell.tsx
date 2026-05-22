'use client';

import { useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';
import { markNotificationRead } from '@/lib/actions/settlements';
import type { Notification } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export function NotificationsBell({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const [items, setItems] = useState(initialNotifications);
  const [, startTransition] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px]">
              {unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-3 py-2 border-b border-border font-medium text-sm">
          Notifications
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No notifications</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 ${!n.read_at ? 'bg-muted/30' : ''}`}
                onClick={() => !n.read_at && markRead(n.id)}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && (
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
