import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { TeamSettingsForm } from '@/components/team/team-settings-form';
import { SettingsPageShell } from '@/components/settings/settings-page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/formatters';

export const metadata = { title: 'Team settings' };

export default async function SettingsTeamPage() {
  const session = await requireTeam();
  if (!canEdit(session.role)) redirect('/settings/profile');

  const supabase = await createClient();
  const { data: team } = await supabase.from('teams').select('*').eq('id', session.teamId).single();
  const teamName = team?.name ?? 'Workspace';
  const brandName = team?.brand_name || teamName;
  const currency = team?.currency ?? 'PKR';

  return (
    <SettingsPageShell activeHref="/settings/team" canManageTeam>
      <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-2">
        <div className="min-w-0">{team && <TeamSettingsForm team={team} />}</div>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Workspace snapshot</CardTitle>
            <CardDescription>Key team identity and access shortcuts.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 text-sm">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
              <Avatar className="size-12">
                <AvatarFallback>{getInitials(teamName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{teamName}</p>
                <p className="truncate text-muted-foreground">{brandName}</p>
                <Badge variant="outline" className="mt-2 capitalize">
                  {session.role}
                </Badge>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-medium">{currency}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <span className="text-muted-foreground">Public page</span>
                <Badge variant={team?.is_public ? 'default' : 'secondary'}>
                  {team?.is_public ? 'Live' : 'Private'}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="font-medium">Team tools</p>
              <div className="mt-3 grid gap-2">
                <Button variant="outline" asChild>
                  <Link href="/team">Open team page</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/team/invite">Invite members</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="font-medium">Visibility checklist</p>
              <div className="mt-3 space-y-2 text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Brand label</span>
                  <Badge variant={team?.brand_name ? 'default' : 'secondary'}>
                    {team?.brand_name ? 'Custom' : 'Team name'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Public access</span>
                  <Badge variant={team?.is_public ? 'default' : 'secondary'}>
                    {team?.is_public ? 'Enabled' : 'Private'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsPageShell>
  );
}
