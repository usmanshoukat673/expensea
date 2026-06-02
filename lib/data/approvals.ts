import { createClient } from '@/lib/supabase/server';
import type { LunchEntryWithProfile, Profile } from '@/lib/database.types';

async function attachProfiles(entries: LunchEntryWithProfile[]) {
  if (!entries.length) return [];
  const supabase = await createClient();
  const ids = [
    ...new Set(
      entries
        .flatMap((entry) => [entry.user_id, entry.submitted_by, entry.approved_by])
        .filter(Boolean) as string[],
    ),
  ];
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids);
  const profiles = new Map((data ?? []).map((profile) => [profile.id, profile]));
  return entries.map((entry) => ({
    ...entry,
    profiles: profiles.get(entry.user_id) as Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null,
    submitter: entry.submitted_by ? profiles.get(entry.submitted_by) ?? null : null,
    approver: entry.approved_by ? profiles.get(entry.approved_by) ?? null : null,
  }));
}

export async function getApprovalQueue(
  teamId: string,
  opts?: {
    from?: string;
    to?: string;
    categoryId?: string;
    submitterId?: string;
  },
) {
  const supabase = await createClient();
  let query = supabase
    .from('lunch_entries')
    .select('*, expense_categories(id, name, icon, color, slug), lunch_entry_participants(user_id, share_amount)')
    .eq('team_id', teamId)
    .in('approval_status', ['pending_approval', 'approved', 'rejected', 'reimbursed'])
    .order('created_at', { ascending: false });

  if (opts?.from) query = query.gte('lunch_date', opts.from);
  if (opts?.to) query = query.lte('lunch_date', opts.to);
  if (opts?.categoryId && opts.categoryId !== 'all') query = query.eq('category_id', opts.categoryId);
  if (opts?.submitterId && opts.submitterId !== 'all') query = query.eq('submitted_by', opts.submitterId);

  const { data } = await query.limit(300);
  const entries = await attachProfiles((data ?? []) as unknown as LunchEntryWithProfile[]);
  return {
    pending: entries.filter((entry) => entry.approval_status === 'pending_approval'),
    approved: entries.filter((entry) => ['approved', 'reimbursed'].includes(entry.approval_status)),
    rejected: entries.filter((entry) => entry.approval_status === 'rejected'),
  };
}
