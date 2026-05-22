import { Suspense } from 'react';
import { requireTeam, canEdit } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/app-layout';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { CurrencyProvider } from '@/components/providers/currency-provider';
import { CommandPalette } from '@/components/command-palette';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { normalizeCurrencyCode } from '@/lib/currency';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTeam();
  const supabase = await createClient();
  const { data: team } = await supabase
    .from('teams')
    .select('name, slug, currency')
    .eq('id', session.teamId)
    .single();

  const userCanEdit = canEdit(session.role);
  const currencyCode = normalizeCurrencyCode(team?.currency);

  return (
    <CurrencyProvider initialCode={currencyCode} canEdit={userCanEdit}>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
    <AppLayout
      user={{
        name: session.profile.full_name ?? 'User',
        email: session.profile.email ?? '',
        avatar: session.profile.avatar_url,
      }}
      teamName={team?.name ?? 'Team'}
      role={session.role}
      teamId={session.teamId}
      teamSlug={team?.slug}
    >
      <RealtimeProvider teamId={session.teamId} />
      <CommandPalette canEdit={userCanEdit} />
      {children}
    </AppLayout>
    </CurrencyProvider>
  );
}
