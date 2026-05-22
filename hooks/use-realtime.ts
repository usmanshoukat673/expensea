'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useRealtime(teamId: string | null, tables: string[] = ['lunch_entries']) {
  const router = useRouter();

  useEffect(() => {
    if (!teamId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`team-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lunch_entries',
          filter: `team_id=eq.${teamId}`,
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_summaries',
          filter: `team_id=eq.${teamId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, router, tables]);
}
