'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateProfile } from '@/lib/actions/profile';
import type { Profile } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequiredLabel } from '@/components/ui/required-label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemePreference } from '@/components/settings/theme-preference';
import { CurrencyPreference } from '@/components/settings/currency-preference';

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        <form
          action={(fd) =>
            startTransition(async () => {
              const r = await updateProfile(fd);
              if (r?.error) toast.error(r.error);
              else toast.success('Profile updated successfully.');
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <RequiredLabel htmlFor="fullName" required>Full name</RequiredLabel>
            <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ''} required />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="email">Email</RequiredLabel>
            <Input id="email" value={profile.email ?? ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="avatarUrl" optional>Avatar URL</RequiredLabel>
            <Input id="avatarUrl" name="avatarUrl" defaultValue={profile.avatar_url ?? ''} placeholder="https://..." />
          </div>
          <Button type="submit" isLoading={pending} loadingText="Saving changes...">
            Save changes
          </Button>
        </form>
        <div className="space-y-6 border-t border-border pt-6">
          <CurrencyPreference />
          <ThemePreference />
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
