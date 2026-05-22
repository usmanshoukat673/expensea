'use client';

import { useTeamContext } from '@/components/providers/team-provider';

export function useTeam() {
  return useTeamContext();
}
