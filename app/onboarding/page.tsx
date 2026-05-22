import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

export const metadata = { title: 'Onboarding' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const session = await requireAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome{session.profile.full_name ? `, ${session.profile.full_name.split(' ')[0]}` : ''}</h1>
          <p className="text-muted-foreground">Complete your profile, then set up your workspace.</p>
        </div>
        <OnboardingForm defaultName={session.profile.full_name ?? ''} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/create-team">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
              <Plus className="w-6 h-6 text-accent" />
              <span className="font-semibold">Create team</span>
              <span className="text-xs text-muted-foreground font-normal">Start a new workspace</span>
            </Button>
          </Link>
          <Link href="/join-team">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
              <Users className="w-6 h-6 text-accent" />
              <span className="font-semibold">Join team</span>
              <span className="text-xs text-muted-foreground font-normal">Use an invite link</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
