import { redirect } from 'next/navigation';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { InviteMemberForm } from '@/components/team/invite-member-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, ShieldCheck, UserRoundPlus } from 'lucide-react';

export const metadata = { title: 'Invite members' };

export default async function TeamInvitePage() {
  const session = await requireTeam();
  if (!canEdit(session.role)) redirect('/settings/profile');

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invite members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite colleagues to Expensea. They will see: &ldquo;You have been invited to join Expensea&rdquo; — Smarter Expense Tracking for Teams.
        </p>
      </div>
      <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <InviteMemberForm />
        </div>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Invite workspace</CardTitle>
            <CardDescription>Choose the right invite path for a clean team onboarding flow.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground">
                  <Mail className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Email invitation</p>
                  <p className="mt-1 text-muted-foreground">
                    Best for a specific teammate when you want their invite tied to one email address.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-foreground">
                  <UserRoundPlus className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Shareable link</p>
                  <p className="mt-1 text-muted-foreground">
                    Useful for onboarding a small group through chat, docs, or an internal workspace note.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="font-medium">Role guide</p>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Admin</span>
                  <Badge variant="outline">Manage entries</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Viewer</span>
                  <Badge variant="secondary">Read only</Badge>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <p className="font-medium">Invite checklist</p>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Pick a role</span>
                  <Badge variant="outline">Required</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Set expiry</span>
                  <Badge variant="outline">Recommended</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Share securely</span>
                  <Badge variant="outline">Team access</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
