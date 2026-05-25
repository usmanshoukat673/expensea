'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { resetPassword } from '@/lib/actions/auth';
import { resetPasswordSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/auth/password-input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { z } from 'zod';

type FormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('password', data.password);
    fd.set('confirmPassword', data.confirmPassword);
    startTransition(async () => {
      const result = await resetPassword(fd);
      if (result?.error) toast.error(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput id="password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput id="confirmPassword" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null}
        Update password
      </Button>
    </form>
  );
}
