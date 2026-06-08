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
import { RequiredLabel } from '@/components/ui/required-label';
import { Spinner } from '@/components/ui/spinner';

type FormData = z.infer<typeof onboardingNameSchema>;

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(onboardingNameSchema),
    mode: 'onChange',
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <RequiredLabel htmlFor="fullName" required>Full name</RequiredLabel>
        <Input id="fullName" placeholder="e.g. Ayesha Khan" autoComplete="name" {...register('fullName')} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={pending || !isValid}>
        {pending ? <Spinner /> : null}
        Save profile
      </Button>
    </form>
  );
}
