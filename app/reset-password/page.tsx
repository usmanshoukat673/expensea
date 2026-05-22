import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
