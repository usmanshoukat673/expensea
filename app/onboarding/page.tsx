import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/branding/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { CheckCircle2, Circle, Plus, ShieldCheck, Sparkles, UserCheck, Users } from 'lucide-react';

export const metadata = { title: 'Onboarding' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const session = await requireAuth();
  const firstName = session.profile.full_name?.split(' ')[0];
  const hasProfileName = Boolean(session.profile.full_name);

  const steps = [
    { label: 'Create Profile', description: 'Confirm how teammates see you.', complete: hasProfileName },
    { label: 'Create Team', description: 'Start a workspace for shared spending.', complete: false },
    { label: 'Invite Members', description: 'Bring admins or viewers into the flow.', complete: false },
    { label: 'Start Tracking Expenses', description: 'Log, review, and settle together.', complete: false },
  ];

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
              <div className="space-y-7">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  Setup in progress
                </Badge>
                <div className="space-y-3">
                  <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                    Welcome{firstName ? `, ${firstName}` : ''}. Let&apos;s get Expensea ready for your team.
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-muted-foreground">
                    Complete your profile, then create or join a workspace so every expense has the right people, roles, and context.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {steps.map((step, index) => {
                  const Icon = step.complete ? CheckCircle2 : Circle;
                  return (
                    <div
                      key={step.label}
                      className="flex gap-3 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm transition-smooth hover:border-accent/50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                        {step.complete ? (
                          <Icon className="size-4 text-accent" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{step.label}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </section>

            <section className="flex h-full flex-col rounded-xl border border-border/70 bg-card/80 p-5 shadow-xl backdrop-blur sm:p-7">
              <div className="space-y-2 border-b border-border/70 pb-5">
                <h2 className="text-xl font-semibold tracking-tight">Profile details</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Use your real name so invites, approvals, and settlement activity are clear to everyone.
                </p>
              </div>

              <div className="space-y-6 pt-6">
                <OnboardingForm defaultName={session.profile.full_name ?? ''} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4 text-left transition-smooth hover:border-accent/50">
                    <Link href="/create-team">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Plus className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">Create team</span>
                        <span className="block text-xs font-normal text-muted-foreground">Start a new workspace</span>
                      </span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4 text-left transition-smooth hover:border-accent/50">
                    <Link href="/join-team">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Users className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">Join team</span>
                        <span className="block text-xs font-normal text-muted-foreground">Use an invite link</span>
                      </span>
                    </Link>
                  </Button>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <ShieldCheck className="size-4" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">Next up</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        After saving your profile, choose whether to create a workspace or join one from an invite.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <UserCheck className="size-4 text-accent" />
                      Profile ready
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Your name appears on invites, approvals, balances, and activity.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="size-4 text-accent" />
                      Workspace ready
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Create or join a team to unlock the shared expense dashboard.
                    </p>
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
