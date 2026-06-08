'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { signUp } from '@/lib/actions/auth';
import { signupSchema, type SignupInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequiredLabel } from '@/components/ui/required-label';
import { Spinner } from '@/components/ui/spinner';
import { PasswordInput } from '@/components/auth/password-input';

export function SignupForm({ inviteToken }: { inviteToken?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema), mode: 'onChange' });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    const fd = new FormData();
    fd.set('fullName', data.fullName);
    fd.set('email', data.email);
    fd.set('password', data.password);
    fd.set('confirmPassword', data.confirmPassword);
    if (inviteToken) fd.set('inviteToken', inviteToken);
    startTransition(async () => {
      try {
        const result = await signUp(fd);
        if (result?.error) {
          setServerError(result.error);
          toast.error(result.error);
          return;
        }
        if (result?.success) {
          toast.success(result.message ?? 'Account created');
          router.refresh();
          router.push(result.redirectTo ?? '/onboarding');
        }
      } catch {
        const msg = 'Sign up failed. Please try again.';
        setServerError(msg);
        toast.error(msg);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <RequiredLabel htmlFor="fullName" required>Full name</RequiredLabel>
        <Input id="fullName" placeholder="Your name" {...register('fullName')} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <RequiredLabel htmlFor="email" required>Email</RequiredLabel>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <RequiredLabel htmlFor="password" required>Password</RequiredLabel>
        <PasswordInput id="password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <RequiredLabel htmlFor="confirmPassword" required>Confirm password</RequiredLabel>
        <PasswordInput id="confirmPassword" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={pending || !isValid}>
        {pending ? <Spinner /> : null}
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
