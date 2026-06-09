import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { TeamSettingsForm } from '@/components/team/team-settings-form';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/billing', label: 'Billing' },
];

export const metadata = { title: 'Team settings' };

export default async function SettingsTeamPage() {
  const session = await requireTeam();
  if (!canEdit(session.role)) redirect('/settings/profile');

  const supabase = await createClient();
  const { data: team } = await supabase.from('teams').select('*').eq('id', session.teamId).single();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <nav className="flex gap-4 mt-4 border-b border-border">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                t.href === '/settings/team'
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-accent/10 hover:text-foreground dark:hover:bg-muted/50'
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {team && <TeamSettingsForm team={team} />}
      <p className="text-sm text-muted-foreground">
        Invites & members:{' '}
        <Link href="/team" className="text-accent hover:underline">
          Team page
        </Link>
        {' · '}
        <Link href="/team/invite" className="text-accent hover:underline">
          Invite members
        </Link>
      </p>
    </div>
  );
}
