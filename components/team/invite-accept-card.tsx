'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { acceptTeamInvite, type TeamInvitePreview } from '@/lib/actions/team-invites';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

export function InviteAcceptCard({
  token,
  preview,
  isAuthenticated,
  loginHref,
  signupHref,
}: {
  token: string;
  preview: TeamInvitePreview;
  isAuthenticated: boolean;
  loginHref: string;
  signupHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const invalidMessage =
    preview.reason === 'expired'
      ? 'This invitation has expired'
      : preview.reason === 'disabled'
        ? 'This invitation has been disabled'
        : preview.reason === 'usage_exceeded'
          ? 'This invitation has been used too many times'
          : 'Invalid invite link';

  const onJoin = () => {
    startTransition(async () => {
      const r = await acceptTeamInvite(token);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success('Team joined successfully');
      router.refresh();
      router.push('/');
    });
  };

  if (!preview.valid) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{invalidMessage}</p>
          <Button variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Team</span>
            <span className="font-medium text-right">{preview.team_name}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Invited by</span>
            <span className="font-medium text-right">{preview.inviter_name}</span>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary" className="capitalize">
              {preview.role}
            </Badge>
          </div>
          {preview.invited_email && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-right break-all">{preview.invited_email}</span>
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <Button type="button" className="w-full" disabled={pending} onClick={onJoin}>
            {pending ? <Spinner className="mr-2" /> : null}
            Join team
          </Button>
        ) : (
          <div className="space-y-2">
            <Button className="w-full" asChild>
              <Link href={signupHref}>Sign up & join</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href={loginHref}>Sign in to join</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
