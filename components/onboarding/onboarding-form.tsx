'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { completeOnboarding } from '@/lib/actions/teams';
import { onboardingNameSchema } from '@/lib/validations';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type FormData = z.infer<typeof onboardingNameSchema>;

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(onboardingNameSchema),
    defaultValues: { fullName: defaultName },
  });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('fullName', data.fullName);
    startTransition(async () => {
      const result = await completeOnboarding(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success('Profile updated');
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border p-6 space-y-4 bg-card">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" {...register('fullName')} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner className="mr-2" /> : null}
        Save profile
      </Button>
    </form>
  );
}
