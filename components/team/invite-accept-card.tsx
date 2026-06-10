'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { acceptTeamInvite, type TeamInvitePreview } from '@/lib/actions/team-invites';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCurrencyLabel } from '@/lib/currency';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Mail,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react';

export function InviteAcceptCard({
  token,
  preview,
  isAuthenticated,
  alreadyMember,
  loginHref,
  signupHref,
}: {
  token: string;
  preview: TeamInvitePreview;
  isAuthenticated: boolean;
  alreadyMember: boolean;
  loginHref: string;
  signupHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const invalidMessage =
    preview.reason === 'expired'
      ? 'This invitation is no longer valid because it has expired'
      : preview.reason === 'disabled'
        ? 'This invitation is no longer valid because it has been revoked'
        : preview.reason === 'usage_exceeded'
          ? 'This invitation has already been used'
          : 'This invitation link is invalid';
  const invalidTitle =
    preview.reason === 'expired'
      ? 'Invite expired'
      : preview.reason === 'disabled'
        ? 'Invite revoked'
        : preview.reason === 'usage_exceeded'
          ? 'Invite unavailable'
          : 'Invalid invite';
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
  const roleLabel =
    preview.role === 'admin'
      ? 'Admin'
      : preview.role === 'viewer'
        ? 'Member'
        : 'Team member';
  const currencyLabel = preview.team_currency ? getCurrencyLabel(preview.team_currency) : null;

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
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-7" />
        </div>
        <div className="space-y-2.5">
          <h3 className="text-xl font-semibold tracking-tight">{invalidTitle}</h3>
          <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
            {invalidMessage}. Ask the team owner for a fresh invitation before trying again.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="secondary" className="w-full" disabled>
            Contact team owner
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <Avatar className="size-16 rounded-xl border border-border bg-background">
            <AvatarImage src={preview.team_logo_url ?? undefined} alt={`${preview.team_name} logo`} />
            <AvatarFallback className="rounded-xl bg-accent/10 font-semibold text-accent">
              {teamInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-semibold leading-tight">{preview.team_name}</h2>
              <Badge variant="secondary">{roleLabel}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {preview.team_description ||
                (preview.inviter_name
                  ? `${preview.inviter_name} invited you to collaborate in Expensea.`
                  : 'You have been invited to collaborate in Expensea.')}
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
          <p className="mt-2 font-medium">{roleLabel}</p>
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
        {currencyLabel ? (
          <div className="flex justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <CircleDollarSign className="size-4" />
              Currency
            </span>
            <span className="text-right font-medium">{currencyLabel}</span>
          </div>
        ) : null}
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

      {alreadyMember ? (
        <div className="space-y-4 border-t border-border/70 pt-5">
          <div className="flex gap-3 rounded-xl border border-border/70 bg-accent/10 p-4 text-sm">
            <UserRoundCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="space-y-1">
              <p className="font-medium">You are already a member of this team.</p>
              <p className="leading-6 text-muted-foreground">
                Open Expensea to continue in this workspace.
              </p>
            </div>
          </div>
          <Button className="w-full" asChild>
            <Link href="/">Open team</Link>
          </Button>
        </div>
      ) : isAuthenticated ? (
        <Button type="button" className="w-full" isLoading={pending} loadingText="Joining team..." onClick={onJoin}>
          <CheckCircle2 className="size-4" />
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
