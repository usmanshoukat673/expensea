import { AuthSkeleton } from '@/components/loaders/auth-skeleton';
import { AuthLayout } from '@/components/auth/auth-layout';

export default function SignupLoading() {
  return (
    <AuthLayout title="Create your Expensea account" subtitle="Start tracking and managing shared expenses effortlessly">
      <AuthSkeleton />
    </AuthLayout>
  );
}
