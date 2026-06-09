'use client';

import { useTransition } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import {
  disableTeamInvite,
  regenerateTeamInvite,
} from '@/lib/actions/team-invites';
import { isInviteExpired, buildTeamInviteUrl } from '@/lib/invites/utils';
import type { TeamInvite } from '@/lib/database.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Copy, Ban, RefreshCw } from 'lucide-react';

export function TeamInvitesSection({
  invites,
  inviteBaseUrl,
}: {
  invites: TeamInvite[];
  inviteBaseUrl: string;
}) {
  const [pending, startTransition] = useTransition();

  const active = invites.filter((i) => i.is_active && !isInviteExpired(i));
  const inactive = invites.filter((i) => !i.is_active || isInviteExpired(i));

  const copyUrl = async (token: string) => {
    const url = buildTeamInviteUrl(inviteBaseUrl, token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const InviteRow = ({ inv, expired }: { inv: TeamInvite; expired: boolean }) => (
    <div
      key={inv.id}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-border last:border-0"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">
          {inv.invited_email ?? 'Shareable link'}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          <Badge variant="secondary" className="capitalize text-xs">
            {inv.role}
          </Badge>
          <StatusBadge status={expired ? 'expired' : 'active'} className="text-xs" />
          <span className="text-xs text-muted-foreground">
            Uses {inv.usage_count}
            {inv.usage_limit != null ? ` / ${inv.usage_limit}` : ''}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {inv.expires_at
            ? `Expires ${format(new Date(inv.expires_at), 'MMM d, yyyy')}`
            : 'Never expires'}
          {' · '}
          Created {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
        </p>
      </div>
      {!expired && inv.is_active && (
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => copyUrl(inv.token)}
          >
            <Copy className="size-3.5" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set('expiry', '7d');
              startTransition(async () => {
                const r = await regenerateTeamInvite(inv.id, fd);
                if (r?.error) toast.error(r.error);
                else {
                  toast.success('Invite regenerated');
                  if (r.data?.url) await navigator.clipboard.writeText(r.data.url);
                }
              });
            }}
          >
            <RefreshCw className="size-3.5" />
            Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await disableTeamInvite(inv.id);
                if (r?.error) toast.error(r.error);
                else toast.success('Invite disabled');
              })
            }
          >
            <Ban className="size-3.5" />
            Disable
          </Button>
        </div>
      )}
    </div>
  );

  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite management</CardTitle>
        <CardDescription>Active and expired team invitations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {active.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Active invites</h3>
            {active.map((inv) => (
              <InviteRow key={inv.id} inv={inv} expired={false} />
            ))}
          </div>
        )}
        {inactive.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Expired / disabled</h3>
            {inactive.map((inv) => (
              <InviteRow key={inv.id} inv={inv} expired />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
