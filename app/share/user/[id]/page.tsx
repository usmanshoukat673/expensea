import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { getPublicUserSummary } from '@/lib/data/dashboard';
import { formatCurrency } from '@/lib/formatters';
import { PublicPageShell } from '@/components/public/public-page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicUserSummary(id);
  if (!data) return { title: 'Not found' };
  return {
    title: `${data.profile.full_name ?? 'Member'} — Expensea`,
    description: `Public expense balance for ${data.profile.full_name}`,
    openGraph: { title: `${data.profile.full_name ?? 'Member'} | Expensea` },
  };
}

export default async function PublicUserPage({ params }: Props) {
  const { id } = await params;
  const data = await getPublicUserSummary(id);
  if (!data) notFound();

  const totalPending = data.summaries.reduce((s, r) => s + Number(r.pending_amount), 0);
  const totalPaid = data.summaries.reduce((s, r) => s + Number(r.paid_amount), 0);
  const currency = data.team.currency;

  return (
    <PublicPageShell
      title={data.profile.full_name ?? 'Member'}
      subtitle={`${data.team.name} · read-only summary`}
      currencyCode={currency}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPaid, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPending, currency)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.entries.map((e, i) => (
            <div key={i} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
              <span>
                {format(new Date(e.lunch_date), 'dd MMM yyyy')}
                {e.notes ? ` · ${e.notes}` : ''}
              </span>
              <div className="flex gap-2 items-center">
                <StatusBadge status={e.payment_status} />
                <span className="font-medium">{formatCurrency(Number(e.amount), currency)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}
