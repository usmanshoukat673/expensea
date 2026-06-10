'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { sendEmailInvite } from '@/lib/actions/team-invites';
import { inviteSchema } from '@/lib/validations';
import { INVITE_EXPIRY_OPTIONS, type InviteExpiryOption } from '@/lib/invites/utils';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequiredLabel } from '@/components/ui/required-label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { InviteLinkSection } from '@/components/team/invite-link-section';

type FormData = z.infer<typeof inviteSchema>;

export function InviteMemberForm() {
  const [pending, startTransition] = useTransition();
  const [expiry, setExpiry] = useState<InviteExpiryOption>('7d');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(inviteSchema),
    mode: 'onChange',
    defaultValues: { role: 'viewer' },
  });

  const role = watch('role');

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('email', data.email);
    fd.set('role', data.role);
    fd.set('expiry', expiry);
    startTransition(async () => {
      const result = await sendEmailInvite(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success('Email invitation created successfully.');
        setExpiry('7d');
        reset({ email: '', role: 'viewer' });
      }
    });
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <RequiredLabel htmlFor="email" required>Email</RequiredLabel>
              <Input id="email" type="email" placeholder="colleague@company.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <RequiredLabel required>Role</RequiredLabel>
              <Select
                value={watch('role')}
                onValueChange={(v) => setValue('role', v as 'admin' | 'viewer')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — can manage entries</SelectItem>
                  <SelectItem value="viewer">Viewer — read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <RequiredLabel required>Invitation expires</RequiredLabel>
              <Select value={expiry} onValueChange={(v) => setExpiry(v as InviteExpiryOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!isValid} isLoading={pending} loadingText="Sending invite...">
              Send email invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <InviteLinkSection
        role={role}
        expiry={expiry}
        onExpiryChange={setExpiry}
      />
    </div>
  );
}
