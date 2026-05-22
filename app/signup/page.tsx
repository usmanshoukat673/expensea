import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata = { title: 'Sign up' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthLayout title="Create your Expensea account" subtitle="Start tracking and managing shared expenses effortlessly">
      <SignupForm inviteToken={params.invite} />
    </AuthLayout>
  );
}
