import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { JoinTeamForm } from '@/components/onboarding/join-team-form';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/branding/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, KeyRound, Link2, MailCheck, ShieldCheck, UserPlus } from 'lucide-react';

export const metadata = { title: 'Join team' };

export default async function JoinTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; token?: string }>;
}) {
  const params = await searchParams;
  const inviteToken = params.invite ?? params.token;
  if (inviteToken) {
    redirect(`/invite/team/${inviteToken}`);
  }

  await requireAuth();

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
                <Link href="/onboarding" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  <ArrowLeft className="size-4" /> Back
                </Link>

                <div className="space-y-4">
                  <Badge variant="secondary" className="w-fit">
                    Invite access
                  </Badge>
                  <div className="space-y-3">
                    <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Join your team workspace with an invitation token.</h1>
                    <p className="max-w-xl text-base leading-7 text-muted-foreground">
                      Paste the token from your email or open the invite link directly. Expensea will verify the invite before adding you to the workspace.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {[
                    { icon: Link2, label: 'Paste token', text: 'Use the secure code from your invitation.' },
                    { icon: ShieldCheck, label: 'Verify invite', text: 'Expired or mismatched invites are blocked.' },
                    { icon: UserPlus, label: 'Join team', text: 'Your role is applied automatically.' },
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
                <h2 className="text-xl font-semibold tracking-tight">Invitation token</h2>
                <p className="text-sm leading-6 text-muted-foreground">Use a full invite link for the richest preview, or paste the token here to join directly.</p>
              </div>
              <div className="flex flex-1 flex-col justify-center gap-6 pt-6">
                <JoinTeamForm defaultToken={params.token} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="size-4 text-accent" />
                      Token access
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Tokens are checked before Expensea adds your account to a workspace.</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MailCheck className="size-4 text-accent" />
                      Email match
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Email-specific invites only work for the account they were sent to.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
