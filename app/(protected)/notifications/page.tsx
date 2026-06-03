import { requireTeam } from '@/lib/auth/session';
import { getNotificationsPage, type NotificationStatus } from '@/lib/data/notifications';
import { NotificationsContent } from '@/components/notifications/notifications-content';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await requireTeam();
  const params = await searchParams;
  const page = Number(params?.page ?? '1') || 1;
  const status = params?.status ?? 'all';
  const safeStatus: NotificationStatus = ['all', 'unread', 'read', 'archived'].includes(status)
    ? (status as NotificationStatus)
    : 'all';
  const search = params?.q ?? '';
  const data = await getNotificationsPage(session.user.id, session.teamId, {
    status: safeStatus,
    search,
    page,
    limit: 20,
  });

  return (
    <NotificationsContent
      initialNotifications={data.notifications}
      total={data.total}
      page={data.page}
      limit={data.limit}
      status={safeStatus}
      search={search}
      teamId={session.teamId}
      userId={session.user.id}
    />
  );
}
