import { getInvitePreview, getInviteViewerState } from '@/lib/actions/team-invites';
import { InviteAcceptCard } from '@/components/team/invite-accept-card';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/branding/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { CheckCircle2, ShieldCheck, UserPlus, Users } from 'lucide-react';

export const metadata = { title: 'Join team' };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

export default async function TeamInviteAcceptPage({ params }: Props) {
  const { token } = await params;
  const preview = (await getInvitePreview(token)) ?? {
    valid: false,
    reason: 'not_found',
  };

  const invitePath = `/invite/team/${token}`;
  const loginHref = `/login?redirect=${encodeURIComponent(invitePath)}`;
  const signupHref = `/signup?invite=${encodeURIComponent(token)}`;
  const viewerState = preview.valid
    ? await getInviteViewerState(preview.team_id)
    : { isAuthenticated: false, alreadyMember: false };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <BrandLogo href="/" size="sm" />
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center py-8 sm:py-10 lg:py-12">
          <div className="grid w-full items-stretch gap-6 lg:grid-cols-2 xl:gap-8">
            <section className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur sm:p-7">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Badge variant="secondary" className="w-fit">
                    Team invitation
                  </Badge>
                  <div className="space-y-3">
                    <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                      Review the workspace before you join.
                    </h1>
                    <p className="max-w-xl text-base leading-7 text-muted-foreground">
                      Expensea verifies the invitation, shows who invited you, and keeps this link ready through sign in or account creation.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {[
                    { icon: ShieldCheck, label: 'Invite checked', text: 'Expired, revoked, or invalid links show a clear state.' },
                    { icon: Users, label: 'Team preview', text: 'See the workspace, role, inviter, members, and currency first.' },
                    { icon: UserPlus, label: 'Join safely', text: 'Your invitation context is preserved during authentication.' },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <item.icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{item.label}</span>
                        <span className="block text-sm leading-6 text-muted-foreground">{item.text}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="flex h-full flex-col rounded-xl border border-border/70 bg-card/80 p-5 shadow-xl backdrop-blur sm:p-7">
              <div className="space-y-2 border-b border-border/70 pb-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-accent" />
                  <h2 className="text-xl font-semibold tracking-tight">
                    {preview.valid ? 'Invitation preview' : 'Invitation unavailable'}
                  </h2>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {preview.valid
                    ? 'Confirm the details below before continuing.'
                    : 'This invite cannot be used to join a workspace.'}
                </p>
              </div>
              <div className="flex flex-1 flex-col justify-center pt-6">
                <InviteAcceptCard
                  token={token}
                  preview={preview}
                  isAuthenticated={viewerState.isAuthenticated}
                  alreadyMember={viewerState.alreadyMember}
                  loginHref={loginHref}
                  signupHref={signupHref}
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
