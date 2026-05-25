'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateProfile } from '@/lib/actions/profile';
import type { Profile } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ThemePreference } from '@/components/settings/theme-preference';
import { CurrencyPreference } from '@/components/settings/currency-preference';

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) =>
            startTransition(async () => {
              const r = await updateProfile(fd);
              if (r?.error) toast.error(r.error);
              else toast.success('Profile updated');
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email ?? ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input id="avatarUrl" name="avatarUrl" defaultValue={profile.avatar_url ?? ''} placeholder="https://..." />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            Save changes
          </Button>
        </form>
        <div className="mt-6 pt-6 border-t border-border space-y-6">
          <CurrencyPreference />
          <ThemePreference />
        </div>
      </CardContent>
    </Card>
  );
}
