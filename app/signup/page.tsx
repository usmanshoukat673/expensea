import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';
import { AUTH_STATUS_MESSAGES } from '@/lib/auth/session';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const metadata = { title: 'Sign up' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; authStatus?: keyof typeof AUTH_STATUS_MESSAGES }>;
}) {
  const params = await searchParams;
  const authMessage = params.authStatus ? AUTH_STATUS_MESSAGES[params.authStatus] : null;
  return (
    <AuthLayout title="Create your Expensea account" subtitle="Start tracking and managing shared expenses effortlessly">
      {authMessage ? (
        <Alert className="mb-4">
          <AlertDescription>{authMessage}</AlertDescription>
        </Alert>
      ) : null}
      <SignupForm inviteToken={params.invite} />
    </AuthLayout>
  );
}
