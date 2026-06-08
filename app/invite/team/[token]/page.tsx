import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getInvitePreview } from '@/lib/actions/team-invites';
import { acceptTeamInvite } from '@/lib/actions/team-invites';
import { invalidateCurrentSession, validateCurrentUser } from '@/lib/auth/session';
import { InviteAcceptCard } from '@/components/team/invite-accept-card';
import { AuthLayout } from '@/components/auth/auth-layout';

export const metadata = { title: 'Join team' };

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

  let isAuthenticated = false;
  if (preview.valid) {
    const validation = await validateCurrentUser();
    if (!validation.valid) {
      if (validation.reason !== 'no_session') {
        await invalidateCurrentSession();
      }
      redirect(signupHref);
    }

    const result = await acceptTeamInvite(token);
    if (result.success) redirect('/');
    isAuthenticated = true;
  }

  return (
    <AuthLayout
      title={preview.valid ? 'You have been invited to join Expensea' : 'Invitation unavailable'}
      subtitle={
        preview.valid
          ? `Smarter Expense Tracking for Teams · Join ${preview.team_name} as ${preview.role}`
          : 'This link is no longer valid'
      }
    >
      <InviteAcceptCard
        token={token}
        preview={preview}
        isAuthenticated={isAuthenticated}
        loginHref={loginHref}
        signupHref={signupHref}
      />
      <p className="text-center text-sm text-muted-foreground mt-4">
        <Link href="/" className="text-accent hover:underline">
          Back to home
        </Link>
      </p>
    </AuthLayout>
  );
}
