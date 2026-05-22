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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type FormData = z.infer<typeof joinTeamSchema>;

export function JoinTeamForm({ defaultToken }: { defaultToken?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(joinTeamSchema),
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
    <form onSubmit={onSubmit} className="rounded-xl border border-border p-6 space-y-4 bg-card">
      <div className="space-y-2">
        <Label htmlFor="token">Invitation token</Label>
        <Input id="token" placeholder="Paste token from invite email" {...register('token')} />
        {errors.token && <p className="text-sm text-destructive">{errors.token.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner className="mr-2" /> : null}
        Join workspace
      </Button>
    </form>
  );
}
