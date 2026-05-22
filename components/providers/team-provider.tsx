'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { switchTeam } from '@/lib/actions/switch-team';
import { getActiveTeamStorageKey, type UserTeam } from '@/lib/auth/teams';
import type { TeamRole } from '@/lib/database.types';

type TeamContextValue = {
  teams: UserTeam[];
  activeTeamId: string;
  activeTeam: UserTeam | null;
  role: TeamRole | null;
  switching: boolean;
  switchToTeam: (teamId: string) => Promise<void>;
};

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({
  children,
  initialTeams,
  initialActiveTeamId,
  initialRole,
}: {
  children: React.ReactNode;
  initialTeams: UserTeam[];
  initialActiveTeamId: string;
  initialRole: TeamRole | null;
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [activeTeamId, setActiveTeamId] = useState(initialActiveTeamId);
  const [role, setRole] = useState<TeamRole | null>(initialRole);
  const [switching, startTransition] = useTransition();

  useEffect(() => {
    setTeams(initialTeams);
    setActiveTeamId(initialActiveTeamId);
    setRole(initialRole);
  }, [initialTeams, initialActiveTeamId, initialRole]);

  useEffect(() => {
    if (typeof window !== 'undefined' && activeTeamId) {
      localStorage.setItem(getActiveTeamStorageKey(), activeTeamId);
    }
  }, [activeTeamId]);

  const activeTeam = useMemo(
    () => teams.find((t) => t.id === activeTeamId) ?? null,
    [teams, activeTeamId]
  );

  const switchToTeam = useCallback(
    async (teamId: string) => {
      if (teamId === activeTeamId || switching) return;
      const next = teams.find((t) => t.id === teamId);
      if (!next) return;

      setActiveTeamId(teamId);
      setRole(next.role);

      startTransition(async () => {
        const result = await switchTeam(teamId);
        if (result.error) {
          setActiveTeamId(initialActiveTeamId);
          setRole(initialRole);
          toast.error(result.error);
          return;
        }
        router.refresh();
      });
    },
    [activeTeamId, switching, teams, initialActiveTeamId, initialRole, router]
  );

  const value = useMemo(
    () => ({
      teams,
      activeTeamId,
      activeTeam,
      role,
      switching,
      switchToTeam,
    }),
    [teams, activeTeamId, activeTeam, role, switching, switchToTeam]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeamContext() {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error('useTeamContext must be used within TeamProvider');
  }
  return ctx;
}
