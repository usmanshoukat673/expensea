import { requireTeam, canEdit } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { getApprovalQueue } from '@/lib/data/approvals';
import { getTeamCategories } from '@/lib/data/categories';
import { getDateRange } from '@/lib/date-ranges';
import { ApprovalsContent } from '@/components/approvals/approvals-content';

export const metadata = { title: 'Approvals' };

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    dateRange?: string;
    from?: string;
    to?: string;
    category?: string;
    submitter?: string;
  }>;
}) {
  const params = await searchParams;
  const range = getDateRange(params?.dateRange ?? 'this_month', params?.from, params?.to);
  const session = await requireTeam();
  const canReview = canEdit(session.role);
  const supabase = await createClient();

  const [queue, { categories }, membersRes] = await Promise.all([
    getApprovalQueue(session.teamId, {
      from: range.from,
      to: range.to,
      categoryId: params?.category,
      submitterId: canReview ? params?.submitter : session.user.id,
    }),
    getTeamCategories(session.teamId),
    supabase
      .from('team_members')
      .select('user_id, profiles(id, full_name, email)')
      .eq('team_id', session.teamId)
      .eq('status', 'active'),
  ]);

  const submitters = (membersRes.data ?? []).map((member) => ({
    id: member.user_id,
    name:
      (member.profiles as { full_name?: string | null; email?: string | null } | null)?.full_name ??
      (member.profiles as { full_name?: string | null; email?: string | null } | null)?.email ??
      'Member',
  }));

  return (
    <ApprovalsContent
      queue={queue}
      categories={categories}
      submitters={submitters}
      dateRange={range}
      categoryFilter={params?.category ?? 'all'}
      submitterFilter={canReview ? params?.submitter ?? 'all' : session.user.id}
      canReview={canReview}
    />
  );
}
