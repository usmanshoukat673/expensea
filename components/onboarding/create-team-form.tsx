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
import { Text } from 'lucide-react';

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
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace name</Label>
        <Input id="name" placeholder="e.g. Product Team" autoComplete="organization" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
            <Text className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-medium">Description</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Add team guidelines, default currency, and public profile details from workspace settings after creation.
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null}
        Create & continue
      </Button>
    </form>
  );
}
