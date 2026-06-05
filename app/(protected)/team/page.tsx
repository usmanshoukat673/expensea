import { redirect } from 'next/navigation';
import { canEdit, requireTeam } from '@/lib/auth/session';
import { getTeamData } from '@/lib/data/dashboard';
import { TeamContent } from '@/components/team/team-content';

export const metadata = { title: 'Team' };

export default async function TeamPage() {
  const session = await requireTeam();
  if (!canEdit(session.role)) redirect('/my-expenses');
  const data = await getTeamData(session.teamId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <TeamContent
      members={data.members as Parameters<typeof TeamContent>[0]['members']}
      invites={data.invites}
      invitations={data.invitations}
      activity={data.activity as Parameters<typeof TeamContent>[0]['activity']}
      currentUserId={session.user.id}
      currentRole={session.role}
      inviteBaseUrl={baseUrl}
    />
  );
}
