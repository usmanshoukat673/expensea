'use server';

import { redirect } from 'next/navigation';
import { ensureUserProfile } from '@/lib/auth/ensure-profile';
import { createClient } from '@/lib/supabase/server';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validations';

export type ActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
  redirectTo?: string;
};

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: error.message };

    const redirectTo = (formData.get('redirect') as string) || '/onboarding';
    return {
      success: true,
      redirectTo: redirectTo.startsWith('/') ? redirectTo : '/onboarding',
    };
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: 'Supabase is not configured. Add keys to .env and restart the dev server.' };
  }

  try {
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      const msg = error.message;
      if (msg.toLowerCase().includes('database error')) {
        return {
          error:
            'Account setup failed in the database. Run supabase/migrations/002_fix_auth_user_trigger.sql in the Supabase SQL Editor, then try again.',
        };
      }
      return { error: msg };
    }

    if (data.user) {
      await ensureUserProfile(supabase, data.user);
    }

    const inviteToken = String(formData.get('inviteToken') ?? '').trim();

    if (!data.session) {
      const loginRedirect = inviteToken
        ? `/login?redirect=${encodeURIComponent(`/invite/team/${inviteToken}`)}`
        : '/login';
      return {
        success: true,
        message: 'Account created. Check your email to confirm, then sign in.',
        redirectTo: loginRedirect,
      };
    }

    if (inviteToken) {
      const { acceptTeamInvite } = await import('@/lib/actions/team-invites');
      const joinResult = await acceptTeamInvite(inviteToken);
      if (joinResult.success) {
        return { success: true, redirectTo: '/' };
      }
      return {
        success: true,
        redirectTo: `/invite/team/${inviteToken}`,
        message: joinResult.error,
      };
    }

    return { success: true, redirectTo: '/onboarding' };
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function forgotPassword(formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid email' };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return { success: true, redirectTo: '/onboarding' };
}
