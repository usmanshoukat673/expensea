'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { joinTeamByToken } from '@/lib/actions/teams';
import { joinTeamSchema } from '@/lib/validations';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequiredLabel } from '@/components/ui/required-label';
import { Spinner } from '@/components/ui/spinner';

type FormData = z.infer<typeof joinTeamSchema>;

export function JoinTeamForm({ defaultToken }: { defaultToken?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(joinTeamSchema),
    mode: 'onChange',
    defaultValues: { token: defaultToken ?? '' },
  });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('token', data.token);
    startTransition(async () => {
      const result = await joinTeamByToken(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success('Joined workspace');
        router.refresh();
        router.push('/');
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <RequiredLabel htmlFor="token" required>Invitation token</RequiredLabel>
        <Input id="token" placeholder="Paste token from invite email" autoComplete="off" {...register('token')} />
        {errors.token && <p className="text-sm text-destructive">{errors.token.message}</p>}
      </div>
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
        Invite links automatically open a preview with the team name, invited role, and inviter before you join.
      </div>
      <Button type="submit" className="w-full" disabled={pending || !isValid}>
        {pending ? <Spinner /> : null}
        Join workspace
      </Button>
    </form>
  );
}
