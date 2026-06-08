'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Plus, Scale, Search } from 'lucide-react';
import { toast } from 'sonner';
import { updateSettlementStatus } from '@/lib/actions/settlements';
import type { SettlementWithProfiles } from '@/lib/database.types';
import type { DebtEdge, UserBalance } from '@/lib/balance/engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrency } from '@/hooks/use-currency';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SettlementDialog } from '@/components/settlements/settlement-dialog';
import { EmptyState } from '@/components/ui/empty-states';
import type { DateRangeValue } from '@/lib/date-ranges';
import { DateRangeFilter } from '@/components/filters/date-range-filter';
import { FilterField, FilterSheet } from '@/components/filters/filter-sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MemberName = { userId: string; name: string };

export function SettlementsContent({
  settlements,
  pendingSettlements,
  recentCompleted,
  userBalances,
  debtEdges,
  pendingTotal,
  personal,
  members,
  canEdit,
  dateRange,
}: {
  settlements: SettlementWithProfiles[];
  pendingSettlements: SettlementWithProfiles[];
  recentCompleted: SettlementWithProfiles[];
  userBalances: UserBalance[];
  debtEdges: DebtEdge[];
  pendingTotal: number;
  personal: { youOwe: number; youReceive: number };
  members: MemberName[];
  canEdit: boolean;
  dateRange: DateRangeValue;
}) {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [items, setItems] = useState(settlements);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(settlements);
  }, [settlements]);

  const nameMap = useMemo(
    () => new Map(members.map((m) => [m.userId, m.name])),
    [members],
  );

  const filterList = (list: SettlementWithProfiles[]) => {
    const q = debounced.toLowerCase();
    return list.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (memberFilter !== 'all' && s.payer_user_id !== memberFilter && s.receiver_user_id !== memberFilter) return false;
      if (!q) return true;
      const payer = s.payer?.full_name ?? '';
      const receiver = s.receiver?.full_name ?? '';
      return (
        payer.toLowerCase().includes(q) ||
        receiver.toLowerCase().includes(q) ||
        (s.note?.toLowerCase().includes(q) ?? false)
      );
    });
  };

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (memberFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setStatusFilter('all');
    setMemberFilter('all');
  };

  const pendingList = filterList(items.filter((s) => s.status === 'pending'));
  const completedList = filterList(items.filter((s) => s.status === 'completed'));

  const markStatus = (id: string, status: 'completed' | 'cancelled') => {
    startTransition(async () => {
      const r = await updateSettlementStatus(id, status);
      if (r?.error) toast.error(r.error);
      else {
        setItems((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, status, settled_at: status === 'completed' ? new Date().toISOString() : null }
              : s,
          ),
        );
        toast.success(status === 'completed' ? 'Marked settled' : 'Cancelled');
      }
    });
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settlements</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track balances and settle up with teammates.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <DateRangeFilter range={dateRange} />
          {canEdit && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Record settlement
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending balances</CardDescription>
            <CardTitle className="text-2xl">{format(pendingTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription>You owe</CardDescription>
            <ArrowDownLeft className="size-4 shrink-0 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {format(personal.youOwe)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription>You should receive</CardDescription>
            <ArrowUpRight className="size-4 shrink-0 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {format(personal.youReceive)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="size-4 shrink-0" />
              Simplified debts
            </CardTitle>
            <CardDescription>Optimized payment chain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {debtEdges.length === 0 ? (
              <p className="text-sm text-muted-foreground">All settled up</p>
            ) : (
              debtEdges.map((e, i) => (
                <div key={i} className="text-sm py-2 border-b border-border last:border-0">
                  <span className="font-medium">{nameMap.get(e.from) ?? 'Member'}</span>
                  <span className="text-muted-foreground"> pays </span>
                  <span className="font-medium">{nameMap.get(e.to) ?? 'Member'}</span>
                  <span className="float-right font-semibold">{format(e.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[280px] overflow-y-auto">
            {userBalances
              .filter((b) => b.totalOwed > 0 || b.netBalance > 0)
              .map((b) => (
                <div key={b.userId} className="flex justify-between text-sm">
                  <span>{nameMap.get(b.userId) ?? 'Member'}</span>
                  <span className={b.netBalance >= 0 ? 'text-green-600' : 'text-amber-600'}>
                    {b.netBalance >= 0
                      ? `+${format(b.netBalance)}`
                      : `-${format(b.totalOwed)}`}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex max-w-2xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search settlements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSheet
          activeCount={activeFilterCount}
          title="Settlement filters"
          description="Filter settlements by status and participating member."
          onReset={resetFilters}
        >
          <FilterField label="Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Member">
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterSheet>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingList.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <SettlementTable
            rows={pendingList}
            format={format}
            canEdit={canEdit}
            pending={pending}
            onMark={markStatus}
          />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <SettlementTable
            rows={completedList.slice(0, 30)}
            format={format}
            canEdit={false}
            pending={pending}
          />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <SettlementTable
            rows={filterList(items)}
            format={format}
            canEdit={canEdit}
            pending={pending}
            onMark={markStatus}
          />
        </TabsContent>
      </Tabs>

      {recentCompleted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent settlements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentCompleted.map((s) => (
              <div key={s.id} className="text-sm flex justify-between py-1">
                <span>
                  {s.payer?.full_name} → {s.receiver?.full_name}
                </span>
                <span className="font-medium">{format(Number(s.amount))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <SettlementDialog
        members={members}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

function SettlementTable({
  rows,
  format,
  canEdit,
  pending,
  onMark,
}: {
  rows: SettlementWithProfiles[];
  format: (n: number) => string;
  canEdit: boolean;
  pending: boolean;
  onMark?: (id: string, status: 'completed' | 'cancelled') => void;
}) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={Scale}
        title="No settlements"
        description="Record a settlement when someone pays another member back."
      />
    );
  }

  return (
    <div className="min-w-0 overflow-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payer</TableHead>
            <TableHead>Receiver</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            {canEdit && onMark && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.payer?.full_name ?? '—'}</TableCell>
              <TableCell>{s.receiver?.full_name ?? '—'}</TableCell>
              <TableCell className="font-medium">{format(Number(s.amount))}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    s.status === 'completed'
                      ? 'default'
                      : s.status === 'cancelled'
                        ? 'outline'
                        : 'secondary'
                  }
                >
                  {s.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
              </TableCell>
              {canEdit && onMark && s.status === 'pending' && (
                <TableCell className="text-right space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => onMark(s.id, 'completed')}
                  >
                    Settle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => onMark(s.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
