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
import { EmptyState } from '@/components/ui/empty-states';
import { Activity, Mail, UserPlus, Users } from 'lucide-react';

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
  const activeInviteCount = invites.length + invitations.length;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage members, invitations, and workspace activity.
          </p>
        </div>
        {canEdit && <InviteMemberDialog />}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" />
              Members
            </CardDescription>
            <CardTitle className="text-2xl">{members.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Mail className="size-4" />
              Pending invites
            </CardDescription>
            <CardTitle className="text-2xl">{activeInviteCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="size-4" />
              Recent activity
            </CardDescription>
            <CardTitle className="text-2xl">{activity.length}</CardTitle>
          </CardHeader>
        </Card>
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

      {canEdit && invites.length === 0 && invitations.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={UserPlus}
              title="No invites"
              description="Create an invitation when you are ready to bring another teammate into the workspace."
              actionLabel="Invite member"
              actionHref="/team/invite"
            />
          </CardContent>
        </Card>
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
