import Link from 'next/link';
import { cn } from '@/lib/utils';
import { canEdit, requireTeam } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const tabs = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/billing', label: 'Billing' },
];

export const metadata = { title: 'Billing' };

export default async function BillingSettingsPage() {
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
                t.href === '/settings/billing'
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-accent/10 hover:text-foreground dark:hover:bg-muted/50'
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Free plan</CardTitle>
            <Badge>Active</Badge>
          </div>
          <CardDescription>
            Expensea is free for teams. Billing integrations can be added when you scale.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Unlimited members, entries, and public sharing on the free tier.</p>
          <p>Contact your admin to upgrade when premium plans launch.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>About Expensea</CardTitle>
          <CardDescription>Expensea — Smarter Expense Tracking</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>A modern platform to manage team expenses efficiently.</p>
          <p className="text-xs">Version 0.1.0</p>
        </CardContent>
      </Card>
    </div>
  );
}
