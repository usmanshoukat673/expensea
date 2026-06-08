import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';
import { signOut } from '@/lib/actions/auth';
import { AUTH_STATUS_MESSAGES } from '@/lib/auth/session';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; authStatus?: keyof typeof AUTH_STATUS_MESSAGES }>;
}) {
  const params = await searchParams;
  const authMessage = params.authStatus ? AUTH_STATUS_MESSAGES[params.authStatus] : null;
  const isMissingProfile =
    params.authStatus === 'profile_missing' || params.authStatus === 'account_deleted';

  return (
    <AuthLayout title="Welcome to Expensea" subtitle="Smarter Expense Tracking for Teams">
      {authMessage ? (
        <Alert className="mb-4">
          <AlertDescription className="space-y-3">
            <p>{authMessage}</p>
            {isMissingProfile ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild size="sm">
                  <Link href="/signup">Go to Sign Up</Link>
                </Button>
                <form action={signOut}>
                  <Button type="submit" variant="outline" size="sm" className="w-full">
                    Log Out
                  </Button>
                </form>
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <LoginForm redirect={params.redirect} />
    </AuthLayout>
  );
}
