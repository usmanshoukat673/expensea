'use client';

import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  Crown,
  ReceiptText,
  Scale,
  Search,
  Users,
  WalletCards,
} from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { EmptyState } from '@/components/ui/empty-states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryIcon } from '@/lib/categories/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

const PublicSpendingChart = dynamic(
  () => import('@/components/charts/public-spending-chart').then((m) => m.PublicSpendingChart),
  { ssr: false, loading: () => <Skeleton className="h-[240px] w-full rounded-lg" /> },
);

const ExpensesByCategoryChart = dynamic(
  () => import('@/components/charts/category-charts').then((m) => m.ExpensesByCategoryChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full rounded-lg" /> },
);

type Entry = {
  amount: number;
  lunch_date: string;
  payment_status: string;
  payerKey: string;
  payerName: string;
  title: string;
  category_id?: string | null;
  expense_categories?: { id: string; name: string; icon: string; color: string } | null;
};

type PublicMember = {
  key: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string | null;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  recentExpenses: Entry[];
  settlementSummary: DebtEdge[];
};

type DebtEdge = {
  fromKey: string;
  fromName: string;
  toKey: string;
  toName: string;
  amount: number;
};

type PublicSettlement = DebtEdge & {
  status: string;
};

type LeaderboardRow = {
  key: string;
  name: string;
  avatarUrl: string | null;
  total: number;
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'M';
}

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%`;
}

function MemberAvatar({ member }: { member: Pick<PublicMember, 'name' | 'avatarUrl'> }) {
  return (
    <Avatar className="size-10">
      <AvatarImage src={member.avatarUrl ?? undefined} alt={`${member.name} avatar`} />
      <AvatarFallback>{initials(member.name)}</AvatarFallback>
    </Avatar>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  detail?: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="w-full soft-shadow">
      <CardContent className="flex min-h-28 items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold">{value}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
        <span className="rounded-md bg-accent/10 p-2 text-accent">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

export function PublicTeamView({
  teamName,
  brandName,
  logoUrl,
  currencyCode,
  total,
  pending,
  currentMonthSpend,
  lastMonthSpend,
  monthlyDifferencePercent,
  settlementCount,
  members,
  entries,
  analyticsEntries,
  showCategoryAnalytics = true,
  balanceEdges = [],
  outstandingSettlements = [],
  leaderboard = [],
  showBalances = false,
}: {
  teamName: string;
  brandName?: string | null;
  logoUrl?: string | null;
  currencyCode?: string | null;
  total: number;
  pending: number;
  currentMonthSpend: number;
  lastMonthSpend: number;
  monthlyDifferencePercent: number;
  settlementCount: number;
  members: PublicMember[];
  entries: Entry[];
  analyticsEntries: Entry[];
  showCategoryAnalytics?: boolean;
  balanceEdges?: DebtEdge[];
  outstandingSettlements?: PublicSettlement[];
  leaderboard?: LeaderboardRow[];
  showBalances?: boolean;
}) {
  const { format: fmt } = useCurrency();
  const [memberSearch, setMemberSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedMemberKey, setSelectedMemberKey] = useState<string | null>(null);

  const selectedMember = members.find((member) => member.key === selectedMemberKey) ?? null;
  const publicDescription = brandName
    ? `${brandName} shared finance dashboard`
    : 'Shared team finance dashboard';

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      `${member.name} ${member.role}`.toLowerCase().includes(query),
    );
  }, [memberSearch, members]);

  const filteredEntries = useMemo(() => {
    const query = expenseSearch.trim().toLowerCase();
    if (!query) return entries.slice(0, 20);
    return entries
      .filter((entry) =>
        `${entry.title} ${entry.payerName} ${entry.expense_categories?.name ?? ''}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 20);
  }, [entries, expenseSearch]);

  const categoryRows = useMemo(() => {
    const totalAmount = analyticsEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const rows = new Map<string, { name: string; amount: number; color: string; icon?: string }>();
    analyticsEntries.forEach((entry) => {
      const name = entry.expense_categories?.name ?? 'Uncategorized';
      const key = entry.category_id ?? name;
      const row = rows.get(key) ?? {
        name,
        amount: 0,
        color: entry.expense_categories?.color ?? '#64748b',
        icon: entry.expense_categories?.icon,
      };
      row.amount += Number(entry.amount);
      rows.set(key, row);
    });
    return Array.from(rows.values())
      .sort((a, b) => b.amount - a.amount)
      .map((row) => ({
        ...row,
        percent: totalAmount > 0 ? (row.amount / totalAmount) * 100 : 0,
      }));
  }, [analyticsEntries]);

  return (
    <>
      <section className="grid gap-5 rounded-lg border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <Avatar className="size-16 rounded-lg">
          <AvatarImage src={logoUrl ?? undefined} alt={`${teamName} logo`} />
          <AvatarFallback className="rounded-lg text-lg">{initials(teamName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-2xl font-bold">{teamName}</h2>
            <Badge variant="secondary">{currencyCode ?? 'PKR'}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{publicDescription}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total members" value={members.length} detail="Active public roster" icon={Users} />
        <MetricCard title="Total expenses" value={entries.length} detail="Recent approved records" icon={ReceiptText} />
        <MetricCard title="Total settlements" value={settlementCount} detail="Recorded settlement activity" icon={Scale} />
        <MetricCard title="Team currency" value={currencyCode ?? 'PKR'} detail="Display currency" icon={WalletCards} />
        <MetricCard title="Total spent" value={fmt(total)} detail="Approved shared spend" icon={BadgeDollarSign} />
        <MetricCard title="Current month" value={fmt(currentMonthSpend)} detail="This month spend" icon={CalendarDays} />
        <MetricCard title="Pending amount" value={fmt(pending)} detail="From team summaries" icon={BookOpen} />
        <MetricCard
          title="Monthly change"
          value={formatPercent(monthlyDifferencePercent)}
          detail={`Last month ${fmt(lastMonthSpend)}`}
          icon={monthlyDifferencePercent >= 0 ? ArrowUpRight : ArrowDownRight}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Spending overview</CardTitle>
          </CardHeader>
          <CardContent>
            <PublicSpendingChart entries={analyticsEntries} />
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Top contributors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.length === 0 ? (
              <EmptyState icon={Crown} title="No contributors yet" description="Approved expenses will appear here." />
            ) : (
              leaderboard.map((row, index) => (
                <div key={row.key} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                      {index + 1}
                    </span>
                    <Avatar className="size-8">
                      <AvatarImage src={row.avatarUrl ?? undefined} alt={`${row.name} avatar`} />
                      <AvatarFallback>{initials(row.name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">{row.name}</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{fmt(row.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="w-full">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Member directory</CardTitle>
            <SearchInput
              className="sm:max-w-64"
              placeholder="Search members"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredMembers.length === 0 ? (
              <EmptyState icon={Search} title="No members found" description="Try another member or role." />
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.key}
                  type="button"
                  onClick={() => setSelectedMemberKey(member.key)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <MemberAvatar member={member} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{member.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {roleLabel(member.role)}
                        {member.joinedAt ? ` · Joined ${format(new Date(member.joinedAt), 'MMM yyyy')}` : ''}
                      </span>
                    </span>
                  </span>
                  {showBalances && (
                    <span className={member.netBalance >= 0 ? 'text-sm font-semibold text-emerald-600' : 'text-sm font-semibold text-destructive'}>
                      {member.netBalance >= 0 ? '+' : '-'}
                      {fmt(Math.abs(member.netBalance))}
                    </span>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Member balance summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!showBalances ? (
              <EmptyState icon={Scale} title="Balances not shared" description="This public page is not sharing member balances." />
            ) : members.length === 0 ? (
              <EmptyState icon={Users} title="No members" description="Members will appear when they join this team." />
            ) : (
              members.map((member) => (
                <div key={member.key} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{member.name}</p>
                    <span className={member.netBalance >= 0 ? 'text-sm font-semibold text-emerald-600' : 'text-sm font-semibold text-destructive'}>
                      Balance: {member.netBalance >= 0 ? '+' : '-'}
                      {fmt(Math.abs(member.netBalance))}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>Paid: {fmt(member.totalPaid)}</span>
                    <span>Owes: {fmt(member.totalOwed)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Who owes whom</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!showBalances || balanceEdges.length === 0 ? (
              <EmptyState icon={Scale} title="No balances to show" description="Meaningful nonzero balances will appear here." />
            ) : (
              balanceEdges.map((edge) => (
                <div key={`${edge.fromKey}-${edge.toKey}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                  <p className="min-w-0 text-sm">
                    <span className="font-semibold">{edge.fromName}</span>
                    <span className="text-muted-foreground"> owes </span>
                    <span className="font-semibold">{edge.toName}</span>
                  </p>
                  <span className="shrink-0 text-sm font-semibold">{fmt(edge.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Outstanding settlements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!showBalances || outstandingSettlements.length === 0 ? (
              <EmptyState icon={WalletCards} title="No outstanding settlements" description="Pending settlements will appear here." />
            ) : (
              outstandingSettlements.map((settlement) => (
                <div key={`${settlement.fromKey}-${settlement.toKey}-${settlement.amount}`} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-semibold">{settlement.fromName} to {settlement.toName}</p>
                    <p className="text-muted-foreground">Debtor: {settlement.fromName} · Creditor: {settlement.toName}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Badge variant="secondary">{settlement.status}</Badge>
                    <span className="font-semibold">{fmt(settlement.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!showCategoryAnalytics || categoryRows.length === 0 ? (
              <EmptyState icon={ReceiptText} title="No category data" description="Categorized expenses will appear here." />
            ) : (
              <>
                <ExpensesByCategoryChart entries={analyticsEntries} />
                <div className="space-y-3">
                  {categoryRows.map((row) => {
                    const Icon = row.icon ? getCategoryIcon(row.icon) : ReceiptText;
                    return (
                      <div key={row.name} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="size-4 shrink-0" style={{ color: row.color }} />
                            <span className="truncate">{row.name}</span>
                          </span>
                          <span className="shrink-0 font-semibold">{fmt(row.amount)} · {row.percent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(row.percent, 3)}%`, backgroundColor: row.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent expenses</CardTitle>
            <SearchInput
              className="sm:max-w-64"
              placeholder="Search expenses"
              value={expenseSearch}
              onChange={(event) => setExpenseSearch(event.target.value)}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredEntries.length === 0 ? (
              <EmptyState icon={BookOpen} title="No expenses found" description="Approved public expenses will appear here." />
            ) : (
              filteredEntries.map((entry, index) => {
                const cat = entry.expense_categories;
                const Icon = cat ? getCategoryIcon(cat.icon) : ReceiptText;
                return (
                  <div key={`${entry.lunch_date}-${entry.amount}-${index}`} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{entry.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(entry.lunch_date), 'dd MMM yyyy')}</span>
                        <span>Paid by {entry.payerName}</span>
                        {cat && (
                          <span className="inline-flex items-center gap-1">
                            <Icon className="size-3" style={{ color: cat.color }} />
                            {cat.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <StatusBadge status={entry.payment_status} />
                      <span className="font-semibold">{fmt(Number(entry.amount))}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      <Drawer open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMemberKey(null)} direction="right">
        <DrawerContent className="sm:max-w-md">
          {selectedMember && (
            <>
              <DrawerHeader>
                <div className="flex items-center gap-3">
                  <MemberAvatar member={selectedMember} />
                  <div className="min-w-0">
                    <DrawerTitle className="truncate">{selectedMember.name}</DrawerTitle>
                    <DrawerDescription>{roleLabel(selectedMember.role)} read-only summary</DrawerDescription>
                  </div>
                </div>
              </DrawerHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="mt-1 font-semibold">{fmt(selectedMember.totalPaid)}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Owed</p>
                    <p className="mt-1 font-semibold">{fmt(selectedMember.totalOwed)}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className={selectedMember.netBalance >= 0 ? 'mt-1 font-semibold text-emerald-600' : 'mt-1 font-semibold text-destructive'}>
                      {selectedMember.netBalance >= 0 ? '+' : '-'}
                      {fmt(Math.abs(selectedMember.netBalance))}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Recent expenses</h3>
                  <div className="mt-3 space-y-2">
                    {selectedMember.recentExpenses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent expenses.</p>
                    ) : (
                      selectedMember.recentExpenses.map((entry, index) => (
                        <div key={`${entry.lunch_date}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{entry.title}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(entry.lunch_date), 'dd MMM yyyy')}</span>
                          </span>
                          <span className="shrink-0 font-semibold">{fmt(entry.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Settlement summary</h3>
                  <div className="mt-3 space-y-2">
                    {!showBalances || selectedMember.settlementSummary.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No meaningful balances.</p>
                    ) : (
                      selectedMember.settlementSummary.map((edge) => (
                        <div key={`${edge.fromKey}-${edge.toKey}`} className="rounded-md border border-border p-3 text-sm">
                          <span className="font-medium">{edge.fromName}</span>
                          <span className="text-muted-foreground"> owes </span>
                          <span className="font-medium">{edge.toName}</span>
                          <span className="float-right font-semibold">{fmt(edge.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
