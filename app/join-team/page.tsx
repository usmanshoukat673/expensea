import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { JoinTeamForm } from '@/components/onboarding/join-team-form';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Join team' };

export default async function JoinTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  if (params.token) {
    redirect(`/invite/team/${params.token}`);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <Link href="/onboarding" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Join workspace</h1>
          <p className="text-muted-foreground mt-1">Paste the invitation token from your email.</p>
        </div>
        <JoinTeamForm defaultToken={params.token} />
      </div>
    </div>
  );
}
