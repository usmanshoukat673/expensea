'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createTeam } from '@/lib/actions/teams';
import { teamNameSchema } from '@/lib/validations';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type FormData = z.infer<typeof teamNameSchema>;

export function CreateTeamForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(teamNameSchema) });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('name', data.name);
    startTransition(async () => {
      const result = await createTeam(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success('Team created');
        router.refresh();
        router.push(result.data?.teamId ? '/' : '/');
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border p-6 space-y-4 bg-card">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace name</Label>
        <Input id="name" placeholder="e.g. Product Team" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner className="mr-2" /> : null}
        Create & continue
      </Button>
    </form>
  );
}
