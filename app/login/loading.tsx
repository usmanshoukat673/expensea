import { AuthSkeleton } from '@/components/loaders/auth-skeleton';
import { AuthLayout } from '@/components/auth/auth-layout';

export default function LoginLoading() {
  return (
    <AuthLayout title="Welcome to Expensea" subtitle="Smarter Expense Tracking for Teams">
      <AuthSkeleton />
    </AuthLayout>
  );
}
