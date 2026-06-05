import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeam, canEdit, isOwner } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { TeamSettingsForm } from '@/components/team/team-settings-form';
import { DeleteTeamButton } from '@/components/team/delete-team-button';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Team settings' };

export default async function TeamSettingsPage() {
  const session = await requireTeam();
  if (!canEdit(session.role)) redirect('/settings/profile');

  const supabase = await createClient();
  const { data: team } = await supabase.from('teams').select('*').eq('id', session.teamId).single();

  return (
    <div className="max-w-xl space-y-8">
      <Link href="/team" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to team
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team settings</h1>
        <p className="text-muted-foreground mt-1">Workspace name and public sharing</p>
      </div>
      {team && <TeamSettingsForm team={team} />}
      {isOwner(session.role) && <DeleteTeamButton />}
    </div>
  );
}
