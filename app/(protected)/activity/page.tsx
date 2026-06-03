import { requireTeam } from '@/lib/auth/session';
import { getActivityLogs } from '@/lib/data/dashboard';
import { ActivityContent } from '@/components/activity/activity-content';

export const metadata = { title: 'Activity' };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; page?: string; q?: string }>;
}) {
  const session = await requireTeam();
  const params = await searchParams;
  const type = params?.type ?? 'all';
  const page = Number(params?.page ?? '1') || 1;
  const search = params?.q ?? '';
  const data = await getActivityLogs(session.teamId, { type, page, limit: 20, search });

  return (
    <ActivityContent
      initialActivity={data.activity}
      total={data.total}
      page={data.page}
      limit={data.limit}
      activeType={type}
      search={search}
      teamId={session.teamId}
    />
  );
}
