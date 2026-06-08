'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { signIn } from '@/lib/actions/auth';
import { loginSchema, type LoginInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequiredLabel } from '@/components/ui/required-label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { PasswordInput } from '@/components/auth/password-input';

export function LoginForm({ redirect }: { redirect?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: 'onChange' });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    const fd = new FormData();
    fd.set('email', data.email);
    fd.set('password', data.password);
    if (redirect) fd.set('redirect', redirect);
    startTransition(async () => {
      try {
        const result = await signIn(fd);
        if (result?.error) {
          setServerError(result.error);
          toast.error(result.error);
          return;
        }
        if (result?.success) {
          router.refresh();
          router.push(result.redirectTo ?? '/onboarding');
        }
      } catch {
        const msg = 'Sign in failed. Please try again.';
        setServerError(msg);
        toast.error(msg);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <RequiredLabel htmlFor="email" required>Email</RequiredLabel>
        <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <RequiredLabel htmlFor="password" required>Password</RequiredLabel>
          <Link href="/forgot-password" className="text-xs text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="remember" name="remember" />
        <RequiredLabel htmlFor="remember" className="text-sm font-normal cursor-pointer">
          Remember me
        </RequiredLabel>
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={pending || !isValid}>
        {pending ? <Spinner /> : null}
        Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/signup" className="text-accent font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
