import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthLayout title="Welcome to Expensea" subtitle="Smarter Expense Tracking for Teams">
      <LoginForm redirect={params.redirect} />
    </AuthLayout>
  );
}
