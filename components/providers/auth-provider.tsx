'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, TeamRole } from '@/lib/database.types';
import type { User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  role: TeamRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const loadProfile = useCallback(
    async (uid: string) => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).single();
      setProfile(p);
      if (p?.team_id) {
        const { data: m } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', p.team_id)
          .eq('user_id', uid)
          .single();
        setRole(m?.role ?? null);
      } else {
        setRole(null);
      }
    },
    [supabase]
  );

  const refresh = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    setUser(u);
    if (u) await loadProfile(u.id);
    else {
      setProfile(null);
      setRole(null);
    }
  }, [supabase, loadProfile]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else {
        setProfile(null);
        setRole(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, refresh, loadProfile]);

  const value = useMemo(
    () => ({ user, profile, role, loading, refresh }),
    [user, profile, role, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
