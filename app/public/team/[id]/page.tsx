import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicTeamById } from '@/lib/data/dashboard';
import { PublicPageShell } from '@/components/public/public-page-shell';
import { PublicTeamView } from '@/components/public/public-team-view';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicTeamById(id);
  if (!data) return { title: 'Not found' };
  return {
    title: `${data.team.name} — Expense Summary`,
    description: `Public expense summary for ${data.team.name}`,
    openGraph: { title: `${data.team.name} | Expensea` },
  };
}

export default async function PublicTeamByIdPage({ params }: Props) {
  const { id } = await params;
  const data = await getPublicTeamById(id);
  if (!data) notFound();

  return (
    <PublicPageShell
      title={data.team.name}
      subtitle="Read-only team expense summary"
      currencyCode={data.team.currency}
    >
      <PublicTeamView
        teamName={data.team.name}
        total={data.total}
        pending={data.pending}
        memberCount={data.members.length}
        entries={data.entries}
      />
    </PublicPageShell>
  );
}
