'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { listUserTeams, type UserTeam } from '@/lib/auth/teams';
import type { Profile, TeamRole } from '@/lib/database.types';
import type { User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  role: TeamRole | null;
  teams: UserTeam[];
  activeTeamId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const clearLocalAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setRole(null);
    setTeams([]);
  }, []);

  const loadProfile = useCallback(
    async (uid: string) => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (!p || p.status !== 'active') {
        clearLocalAuthState();
        await supabase.auth.signOut();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.assign('/login?authStatus=account_deleted');
        }
        return;
      }
      setProfile(p);
      const userTeams = await listUserTeams(supabase, uid);
      setTeams(userTeams);
      const activeId = p?.team_id ?? null;
      const active = userTeams.find((t) => t.id === activeId);
      setRole(active?.role ?? null);
    },
    [supabase, clearLocalAuthState]
  );

  const refresh = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    setUser(u);
    if (u) await loadProfile(u.id);
    else clearLocalAuthState();
  }, [supabase, loadProfile, clearLocalAuthState]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else clearLocalAuthState();
    });
    return () => subscription.unsubscribe();
  }, [supabase, refresh, loadProfile, clearLocalAuthState]);

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      teams,
      activeTeamId: profile?.team_id ?? null,
      loading,
      refresh,
    }),
    [user, profile, role, teams, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
