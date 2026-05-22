import { createClient } from '@/lib/supabase/server';

export async function notifyTeamMembers(opts: {
  teamId: string;
  excludeUserId?: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  memberIds?: string[];
}) {
  const supabase = await createClient();
  let ids = opts.memberIds;

  if (!ids) {
    const { data } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', opts.teamId);
    ids = (data ?? []).map((m) => m.user_id);
  }

  const targets = ids.filter((id) => id !== opts.excludeUserId);
  if (!targets.length) return;

  await supabase.from('notifications').insert(
    targets.map((userId) => ({
      user_id: userId,
      team_id: opts.teamId,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      metadata: opts.metadata ?? {},
    })),
  );
}
