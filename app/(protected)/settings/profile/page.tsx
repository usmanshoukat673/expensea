import Link from 'next/link';
import { canEdit, requireTeam } from '@/lib/auth/session';
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/billing', label: 'Billing' },
];

export const metadata = { title: 'Profile settings' };

export default async function ProfileSettingsPage() {
  const session = await requireTeam();
  const visibleTabs = canEdit(session.role)
    ? tabs
    : tabs.filter((tab) => tab.href !== '/settings/team');

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <nav className="flex gap-4 mt-4 border-b border-border">
          {visibleTabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                t.href === '/settings/profile'
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-accent/10 hover:text-foreground dark:hover:bg-muted/50'
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <ProfileSettingsForm profile={session.profile} />
    </div>
  );
}
