import type { SeedAdmin } from '@/lib/seed/client';
import { DEMO_PASSWORD, DEMO_USERS } from '@/lib/seed/config';
import { daysAgo, log, toIso } from '@/lib/seed/utils';

export type UserMap = Map<string, string>;

export async function seedDemoUsers(admin: SeedAdmin): Promise<UserMap> {
  const map: UserMap = new Map();

  for (const user of DEMO_USERS) {
    const id = await getOrCreateUser(admin, user.email, user.fullName, user.joinedDaysAgo);
    map.set(user.email, id);
  }

  log('users', `${map.size} demo accounts ready`);
  return map;
}

async function getOrCreateUser(
  admin: SeedAdmin,
  email: string,
  fullName: string,
  joinedDaysAgo: number,
): Promise<string> {
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  const joinedAt = toIso(daysAgo(joinedDaysAgo));

  if (existingProfile?.id) {
    await admin.auth.admin.updateUserById(existingProfile.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    await admin
      .from('profiles')
      .update({
        full_name: fullName,
        avatar_url: null,
        onboarding_completed: true,
        created_at: joinedAt,
      })
      .eq('id', existingProfile.id);
    return existingProfile.id;
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !created.user) {
    throw new Error(`Failed to create user ${email}: ${error?.message ?? 'unknown'}`);
  }

  await admin
    .from('profiles')
    .update({
      full_name: fullName,
      avatar_url: null,
      onboarding_completed: true,
      created_at: joinedAt,
    })
    .eq('id', created.user.id);

  return created.user.id;
}
