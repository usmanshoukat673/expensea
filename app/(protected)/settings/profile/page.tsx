import { canEdit, requireTeam } from '@/lib/auth/session';
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form';
import { SettingsPageShell } from '@/components/settings/settings-page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/formatters';

export const metadata = { title: 'Profile settings' };

export default async function ProfileSettingsPage() {
  const session = await requireTeam();
  const profile = session.profile;
  const displayName = profile.full_name || profile.email || 'User';
  const roleLabel = session.role ? session.role.replace(/_/g, ' ') : 'member';

  return (
    <SettingsPageShell activeHref="/settings/profile" canManageTeam={canEdit(session.role)}>
      <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <ProfileSettingsForm profile={profile} />
        </div>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Expensea identity</CardTitle>
            <CardDescription>How your profile appears across the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 text-sm">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
              <Avatar className="size-12">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{displayName}</p>
                <p className="truncate text-muted-foreground">{profile.email || 'No email available'}</p>
                <Badge variant="outline" className="mt-2 capitalize">
                  {roleLabel}
                </Badge>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Name</span>
                <span className="truncate font-medium">{profile.full_name || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Avatar</span>
                <Badge variant={profile.avatar_url ? 'default' : 'secondary'}>
                  {profile.avatar_url ? 'Added' : 'Optional'}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="font-medium">Used in</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">Reports</Badge>
                <Badge variant="secondary">Approvals</Badge>
                <Badge variant="secondary">Activity</Badge>
                <Badge variant="secondary">Team roster</Badge>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-lg border border-border/60 p-4">
                <p className="font-medium">Personal workspace</p>
                <p className="mt-2 text-muted-foreground">
                  Your profile settings keep Expensea recognizable when teammates review spend, approvals, and settlement history.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="font-medium">Status checklist</p>
                <div className="mt-3 space-y-2 text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>Email connected</span>
                    <Badge variant="outline">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Profile name</span>
                    <Badge variant={profile.full_name ? 'default' : 'secondary'}>
                      {profile.full_name ? 'Set' : 'Missing'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsPageShell>
  );
}
