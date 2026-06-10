'use client';

import { useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { revokeInvitation } from '@/lib/actions/teams';
import type { TeamRole, TeamInvitation, TeamInvite, TeamActivity } from '@/lib/database.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TeamMembersTable, type MemberRow } from '@/components/team/team-members-table';
import { InviteMemberDialog } from '@/components/team/invite-member-dialog';
import { TeamInvitesSection } from '@/components/team/team-invites-section';
import { buildTeamInviteUrl } from '@/lib/invites/utils';

export function TeamContent({
  members,
  invites,
  invitations,
  activity,
  currentUserId,
  currentRole,
  inviteBaseUrl,
}: {
  members: MemberRow[];
  invites: TeamInvite[];
  invitations: TeamInvitation[];
  activity: (TeamActivity & { profiles?: { full_name: string | null } | null })[];
  currentUserId: string;
  currentRole: TeamRole | null;
  inviteBaseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [actionKey, setActionKey] = useState<string | null>(null);
  const canEdit = currentRole === 'owner' || currentRole === 'admin';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Team</h1>
          <p className="text-muted-foreground mt-1">{members.length} members · shared expense tracking</p>
        </div>
        {canEdit && <InviteMemberDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {canEdit ? 'Manage roles, status, and expense stats' : 'Read-only team roster'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMembersTable
            members={members as MemberRow[]}
            currentUserId={currentUserId}
            currentRole={currentRole}
          />
        </CardContent>
      </Card>

      {canEdit && invites.length > 0 && (
        <TeamInvitesSection invites={invites} inviteBaseUrl={inviteBaseUrl} />
      )}

      {canEdit && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Legacy pending invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{inv.role}</p>
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    {buildTeamInviteUrl(inviteBaseUrl, inv.token)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={pending && actionKey !== `revoke:${inv.id}`}
                  isLoading={actionKey === `revoke:${inv.id}`}
                  loadingText="Revoking..."
                  onClick={() =>
                    {
                    setActionKey(`revoke:${inv.id}`);
                    startTransition(async () => {
                      try {
                        const r = await revokeInvitation(inv.id);
                        if (r?.error) toast.error(r.error);
                        else toast.success('Invitation revoked');
                      } finally {
                        setActionKey(null);
                      }
                    })
                    }
                  }
                >
                  Revoke
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="text-sm py-2 border-b border-border last:border-0">
                <span className="font-medium">{a.profiles?.full_name ?? 'System'}</span>
                <span className="text-muted-foreground"> · {a.action.replace(/_/g, ' ')}</span>
                <span className="text-xs text-muted-foreground block">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
