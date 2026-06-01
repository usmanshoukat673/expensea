import { createClient } from '@/lib/supabase/server';

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ActivityEntityType =
  | 'expense'
  | 'budget'
  | 'team'
  | 'invite'
  | 'settlement'
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
  };

  await supabase.from('team_activity_log').insert({
    team_id: opts.teamId,
    user_id: opts.userId ?? null,
    action: opts.actionType,
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
  metadata?: Record<string, unknown>;
  memberIds?: string[];
}) {
  const supabase = opts.supabase ?? (await createClient());
  let ids = opts.memberIds;

  if (!ids) {
    const { data } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', opts.teamId)
      .eq('status', 'active');
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
      metadata: opts.metadata ?? {},
    })),
  );
}
