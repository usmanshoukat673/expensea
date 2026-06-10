import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/billing', label: 'Billing' },
];

export function SettingsPageShell({
  activeHref,
  canManageTeam,
  children,
}: {
  activeHref: string;
  canManageTeam: boolean;
  children: ReactNode;
}) {
  const visibleTabs = canManageTeam
    ? settingsTabs
    : settingsTabs.filter((tab) => tab.href !== '/settings/team');

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile, workspace preferences, and Expensea account details.
          </p>
        </div>
        <nav
          aria-label="Settings sections"
          className="flex min-w-0 gap-1 overflow-x-auto border-b border-border"
        >
          {visibleTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={activeHref === tab.href ? 'page' : undefined}
              className={cn(
                'shrink-0 border-b-2 px-3 pb-3 text-sm font-medium transition-colors',
                activeHref === tab.href
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-accent/10 hover:text-foreground dark:hover:bg-muted/50',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
