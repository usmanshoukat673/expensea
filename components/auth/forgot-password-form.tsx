'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { forgotPassword } from '@/lib/actions/auth';
import { forgotPasswordSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequiredLabel } from '@/components/ui/required-label';
import { Spinner } from '@/components/ui/spinner';
import { z } from 'zod';

type FormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({ resolver: zodResolver(forgotPasswordSchema), mode: 'onChange' });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('email', data.email);
    startTransition(async () => {
      const result = await forgotPassword(fd);
      if (result?.error) toast.error(result.error);
      else {
        setSent(true);
        toast.success('Check your email for the reset link');
      }
    });
  });

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">We sent a password reset link to your email.</p>
        <Link href="/login" className="text-accent text-sm font-medium hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <RequiredLabel htmlFor="email" required>Email</RequiredLabel>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={pending || !isValid}>
        {pending ? <Spinner /> : null}
        Send reset link
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
