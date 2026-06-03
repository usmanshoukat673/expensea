import { createClient } from '@/lib/supabase/server';
import { notifyTeamMembers as notifyMembers } from '@/lib/activity';

export async function notifyTeamMembers(opts: {
  teamId: string;
  excludeUserId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
  memberIds?: string[];
  audience?: 'personal' | 'admins' | 'owners' | 'team';
}) {
  const legacyType = opts.type;
  const type =
    legacyType.includes('warning') || legacyType.includes('exceeded')
      ? 'warning'
      : legacyType.includes('completed')
        ? 'success'
        : 'info';

  await notifyMembers({
    supabase: await createClient(),
    teamId: opts.teamId,
    excludeUserId: opts.excludeUserId,
    type,
    title: opts.title,
    message: opts.body ?? opts.title,
    link: opts.link ?? null,
    metadata: { ...(opts.metadata ?? {}), event_type: legacyType },
    memberIds: opts.memberIds,
    audience: opts.audience,
  });
}
