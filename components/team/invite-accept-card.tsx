'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { acceptTeamInvite, type TeamInvitePreview } from '@/lib/actions/team-invites';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CalendarClock, Mail, ShieldCheck, Users } from 'lucide-react';

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
  const teamInitials = preview.team_name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'EX';
  const memberCount =
    typeof preview.member_count === 'number'
      ? `${preview.member_count.toLocaleString()} ${preview.member_count === 1 ? 'member' : 'members'}`
      : null;
  const expiresAt = preview.expires_at
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(preview.expires_at))
    : null;

  const onJoin = () => {
    startTransition(async () => {
      const r = await acceptTeamInvite(token);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(r.data?.alreadyMember ? 'You are already on this team' : 'Team joined successfully');
      router.refresh();
      router.push('/');
    });
  };

  if (!preview.valid) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Invite unavailable</p>
          <p className="text-sm leading-6 text-muted-foreground">{invalidMessage}. Ask your team admin for a fresh invitation.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 font-semibold text-accent">
            {teamInitials}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-semibold leading-tight">{preview.team_name}</h2>
              {preview.role ? (
                <Badge variant="secondary" className="capitalize">
                  {preview.role}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {preview.inviter_name ? `${preview.inviter_name} invited you to collaborate in Expensea.` : 'You have been invited to collaborate in Expensea.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-accent" />
            Invited role
          </div>
          <p className="mt-2 font-medium capitalize">{preview.role ?? 'Team member'}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4 text-accent" />
            Team size
          </div>
          <p className="mt-2 font-medium">{memberCount ?? 'Available after joining'}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Invited by</span>
          <span className="text-right font-medium">{preview.inviter_name ?? 'Team admin'}</span>
        </div>
        {preview.invited_email ? (
          <div className="flex justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" />
              Email
            </span>
            <span className="break-all text-right font-medium">{preview.invited_email}</span>
          </div>
        ) : null}
        {expiresAt ? (
          <div className="flex justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="size-4" />
              Expires
            </span>
            <span className="text-right font-medium">{expiresAt}</span>
          </div>
        ) : null}
      </div>

      {isAuthenticated ? (
        <Button type="button" className="w-full" isLoading={pending} loadingText="Joining team..." onClick={onJoin}>
          Join team
        </Button>
      ) : (
        <div className="space-y-2 border-t border-border/70 pt-5">
          <Button className="w-full" asChild>
            <Link href={signupHref}>Sign up & join</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href={loginHref}>Sign in to join</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
