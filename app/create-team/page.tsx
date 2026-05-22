import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import { CreateTeamForm } from '@/components/onboarding/create-team-form';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Create team' };

export default async function CreateTeamPage() {
  await requireAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <Link href="/onboarding" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create workspace</h1>
          <p className="text-muted-foreground mt-1">Name your team to start tracking shared expenses.</p>
        </div>
        <CreateTeamForm />
      </div>
    </div>
  );
}
