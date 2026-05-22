'use client';

import { useRealtime } from '@/hooks/use-realtime';

export function RealtimeProvider({ teamId }: { teamId: string }) {
  useRealtime(teamId);
  return null;
}
