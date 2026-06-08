import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { CreateTeamForm } from '@/components/onboarding/create-team-form';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/branding/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, Building2, CheckCircle2, Settings2, Sparkles, Text, Users } from 'lucide-react';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Create team' };

export default async function CreateTeamPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const backHref = session.hasMembership ? '/' : '/onboarding';

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
                <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  <ArrowLeft className="size-4" /> Back
                </Link>

                <div className="space-y-4">
                  <Badge variant="secondary" className="w-fit">
                    Workspace setup
                  </Badge>
                  <div className="space-y-3">
                    <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Create a workspace your team can understand at a glance.</h1>
                    <p className="max-w-xl text-base leading-7 text-muted-foreground">
                      Start with the team name. Expensea will create the owner role, set this as your active workspace, and open the team dashboard.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {[
                    { icon: Building2, label: 'Team name', text: 'The primary identity shown across Expensea.' },
                    { icon: Settings2, label: 'Workspace', text: 'Owner access and active team are set automatically.' },
                    { icon: Text, label: 'Details', text: 'Workspace details can be refined from settings.' },
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
                  <h2 className="text-xl font-semibold tracking-tight">Workspace details</h2>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">Choose a clear name now. You can invite members and refine branding after setup.</p>
              </div>
              <div className="flex flex-1 flex-col justify-center gap-6 pt-6">
                <CreateTeamForm />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="size-4 text-accent" />
                      After creation
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">You land in the workspace dashboard with owner permissions enabled.</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="size-4 text-accent" />
                      Team setup
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Invite members, assign roles, and tune settings once the workspace exists.</p>
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
