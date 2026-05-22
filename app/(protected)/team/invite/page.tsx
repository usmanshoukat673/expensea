import { redirect } from 'next/navigation';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { InviteMemberForm } from '@/components/team/invite-member-form';

export const metadata = { title: 'Invite members' };

export default async function TeamInvitePage() {
  const session = await requireTeam();
  if (!canEdit(session.role)) redirect('/team');

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invite members</h1>
        <p className="text-muted-foreground mt-1">
          Invite colleagues to Expensea. They will see: &ldquo;You have been invited to join Expensea&rdquo; — Smarter Expense Tracking for Teams.
        </p>
      </div>
      <InviteMemberForm />
    </div>
  );
}
