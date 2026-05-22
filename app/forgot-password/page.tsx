import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Reset password" subtitle="We will email you a secure reset link">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
