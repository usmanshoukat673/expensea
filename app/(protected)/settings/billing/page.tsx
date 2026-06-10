import { canEdit, requireTeam } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { SettingsPageShell } from '@/components/settings/settings-page-shell';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Billing' };

export default async function BillingSettingsPage() {
  const session = await requireTeam();

  return (
    <SettingsPageShell activeHref="/settings/billing" canManageTeam={canEdit(session.role)}>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Free plan</CardTitle>
              <StatusBadge status="active" />
            </div>
            <CardDescription>
              Expensea is free for teams. Billing integrations can be added when you scale.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="font-medium">Members</p>
              <p className="mt-1 text-muted-foreground">Unlimited workspace access</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="font-medium">Entries</p>
              <p className="mt-1 text-muted-foreground">Unlimited expense records</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="font-medium">Reports</p>
              <p className="mt-1 text-muted-foreground">Exports and team summaries</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="font-medium">Sharing</p>
              <p className="mt-1 text-muted-foreground">Public team pages included</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Billing status</CardTitle>
              <Badge variant="outline">No payment required</Badge>
            </div>
            <CardDescription>Plan and product details for this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current product</p>
              <p className="mt-1 font-medium">Expensea — Smarter Expense Tracking</p>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="mt-1 font-medium">0.1.0</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-muted-foreground">
              Premium billing controls can be connected here when paid plans launch.
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsPageShell>
  );
}
