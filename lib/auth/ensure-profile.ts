import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile } from '@/lib/database.types';

type Supabase = SupabaseClient<Database>;

export async function getUserProfile(
  supabase: Supabase,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return data ?? null;
}

export async function createUserProfileForSignup(
  supabase: Supabase,
  user: User
): Promise<Profile | null> {
  const existing = await getUserProfile(supabase, user.id);

  if (existing) return existing;

  const fullName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    (user.email ? user.email.split('@')[0] : 'User');

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      avatar_url:
        typeof user.user_metadata?.avatar_url === 'string'
          ? user.user_metadata.avatar_url
          : null,
    })
    .select('*')
    .single();

  if (error) return null;
  return data;
}
