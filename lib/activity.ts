import { createClient } from '@/lib/supabase/server';

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ActivityEntityType =
  | 'expense'
  | 'budget'
  | 'team'
  | 'invite'
  | 'settlement'
  | 'approval'
  | 'recurring_expense'
  | 'category';

export type NotificationKind = 'info' | 'warning' | 'success' | 'error';

export async function recordActivity(
  supabase: SupabaseServer,
  opts: {
    teamId: string;
    userId?: string | null;
    actionType: string;
    entityType: ActivityEntityType;
    entityId?: string | null;
    message: string;
    metadata?: Record<string, unknown>;
  },
) {
  const metadata = {
    ...(opts.metadata ?? {}),
    entity_type: opts.entityType,
    entity_id: opts.entityId ?? null,
    message: opts.message,
    description: opts.message,
  };

  await supabase.from('activity_logs').insert({
    team_id: opts.teamId,
    user_id: opts.userId ?? null,
    action_type: opts.actionType,
    entity_type: opts.entityType,
    entity_id: opts.entityId ?? null,
    message: opts.message,
    description: opts.message,
    metadata,
  });
}

export async function notifyTeamMembers(opts: {
  supabase?: SupabaseServer;
  teamId: string;
  excludeUserId?: string;
  type: NotificationKind;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
  memberIds?: string[];
  audience?: 'personal' | 'admins' | 'owners' | 'team';
}) {
  const supabase = opts.supabase ?? (await createClient());
  let ids = opts.memberIds;

  if (!ids) {
    let query = supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', opts.teamId)
      .eq('status', 'active');

    if (opts.audience === 'admins') query = query.in('role', ['owner', 'admin']);
    if (opts.audience === 'owners') query = query.eq('role', 'owner');

    const { data } = await query;
    ids = (data ?? []).map((m) => m.user_id);
  }

  const targets = [...new Set(ids)].filter((id) => id !== opts.excludeUserId);
  if (!targets.length) return;

  await supabase.from('notifications').insert(
    targets.map((userId) => ({
      user_id: userId,
      team_id: opts.teamId,
      type: opts.type,
      title: opts.title,
      body: opts.message,
      message: opts.message,
      link: opts.link ?? null,
      metadata: { ...(opts.metadata ?? {}), audience: opts.audience ?? 'team' },
    })),
  );
}
