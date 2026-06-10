'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus, Search, Pencil, Trash2, PiggyBank } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { deleteTeamBudget } from '@/lib/actions/team-budgets';
import type { ExpenseCategory, TeamBudget } from '@/lib/database.types';
import type { BudgetWithUsage } from '@/lib/budget/engine';
import {
  budgetTypeLabel,
  budgetStatusLabel,
} from '@/lib/budget/engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BudgetDialog } from '@/components/budgets/budget-dialog';
import { BudgetProgress } from '@/components/budgets/budget-progress';
import { EmptyState } from '@/components/ui/empty-states';
import { useCurrency } from '@/hooks/use-currency';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getCategoryIcon } from '@/lib/categories/icons';
import type { DateRangeValue } from '@/lib/date-ranges';
import { DateRangeFilter } from '@/components/filters/date-range-filter';
import { FilterField, FilterSheet } from '@/components/filters/filter-sheet';
import { Spinner } from '@/components/ui/spinner';

export function BudgetsContent({
  budgets,
  usages,
  categories,
  canEdit,
  monthStart,
  dateRange,
}: {
  budgets: TeamBudget[];
  usages: BudgetWithUsage[];
  categories: ExpenseCategory[];
  canEdit: boolean;
  monthStart: string;
  dateRange: DateRangeValue;
}) {
  const { format: fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'monthly' | 'category'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'safe' | 'near' | 'over'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const debounced = useDebouncedValue(search, 300);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TeamBudget | null>(null);
  const [pending, startTransition] = useTransition();
  const [actionKey, setActionKey] = useState<string | null>(null);

  const usageMap = useMemo(
    () => new Map(usages.map((u) => [u.id, u])),
    [usages],
  );

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    return budgets.filter((b) => {
      if (typeFilter !== 'all' && b.type !== typeFilter) return false;
      const usage = usageMap.get(b.id);
      if (statusFilter !== 'all' && usage?.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && b.category_id !== categoryFilter) return false;
      const name =
        b.type === 'category'
          ? usage?.categoryName ?? ''
          : 'Monthly team budget';
      if (!q) return true;
      return (
        name.toLowerCase().includes(q) ||
        budgetTypeLabel(b.type).toLowerCase().includes(q)
      );
    });
  }, [budgets, debounced, typeFilter, statusFilter, categoryFilter, usageMap]);

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const openCreateDialog = () => {
    setEdit(null);
    setOpen(true);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setEdit(null);
  };

  const deleteBudget = (id: string) => {
    setActionKey(`delete:${id}`);
    startTransition(async () => {
      try {
        const r = await deleteTeamBudget(id);
        if (r?.error) toast.error(r.error);
        else toast.success('Budget deleted successfully.');
      } finally {
        setActionKey(null);
      }
    });
  };

  const monthLabel = format(new Date(monthStart), 'MMMM yyyy');

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track spending against limits for {monthLabel}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <DateRangeFilter range={dateRange} />
          {canEdit && (
            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              Create budget
            </Button>
          )}
        </div>
      </div>

      <div className="flex max-w-2xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search budgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSheet
          activeCount={activeFilterCount}
          title="Budget filters"
          description="Filter budgets by type, category, and spending status."
          onReset={resetFilters}
        >
          <FilterField label="Budget type">
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
              <SelectTrigger><SelectValue placeholder="Budget type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Budget status">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="safe">Safe</SelectItem>
                <SelectItem value="near">Near limit</SelectItem>
                <SelectItem value="over">Over budget</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Category">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterSheet>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets"
          description="Set monthly or category budgets to control team spending."
          actionLabel={canEdit ? 'Create budget' : undefined}
          onAction={canEdit ? openCreateDialog : undefined}
        />
      ) : (
        <>
          <div className="hidden min-w-0 overflow-hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Budget</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px]">Progress</TableHead>
                  {canEdit && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const u = usageMap.get(b.id);
                  if (!u) return null;
                  const Icon =
                    b.type === 'category' && b.category_id
                      ? getCategoryIcon(
                          categories.find((c) => c.id === b.category_id)?.icon ??
                            'circle',
                        )
                      : PiggyBank;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon
                            className="size-4 shrink-0"
                            style={
                              u.categoryColor
                                ? { color: u.categoryColor }
                                : undefined
                            }
                          />
                          {u.type === 'category'
                            ? u.categoryName
                            : 'Team monthly'}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {b.month
                            ? format(new Date(b.month), 'MMM yyyy')
                            : 'Recurring'}
                        </span>
                      </TableCell>
                      <TableCell>{budgetTypeLabel(b.type)}</TableCell>
                      <TableCell>{fmt(Number(b.amount))}</TableCell>
                      <TableCell>{fmt(u.spent)}</TableCell>
                      <TableCell>
                        {u.status === 'over' ? (
                          <span className="text-destructive">
                            -{fmt(u.overspent)}
                          </span>
                        ) : (
                          fmt(u.remaining)
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.status}>
                          {budgetStatusLabel(u.status)}
                          {u.alertLevel !== 'none' && (
                            <span className="ml-1 opacity-70">!</span>
                          )}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <BudgetProgress
                            utilization={u.utilization}
                            status={u.status}
                          />
                          <span className="text-xs text-muted-foreground">
                            {u.utilization}%
                          </span>
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEdit(b);
                                setOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete budget?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This removes the budget limit. Spending history is
                                    unchanged.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    disabled={pending && actionKey !== `delete:${b.id}`}
                                    onClick={() => deleteBudget(b.id)}
                                  >
                                    {actionKey === `delete:${b.id}` ? <Spinner /> : null}
                                    {actionKey === `delete:${b.id}` ? 'Deleting...' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid md:hidden grid-cols-1 gap-4">
            {filtered.map((b) => {
              const u = usageMap.get(b.id);
              if (!u) return null;
              return (
                <Card key={b.id} className="hover-lift soft-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {u.type === 'category'
                            ? u.categoryName
                            : 'Team monthly'}
                        </CardTitle>
                        <CardDescription>
                          {budgetTypeLabel(b.type)} ·{' '}
                          {b.month
                            ? format(new Date(b.month), 'MMM yyyy')
                            : 'Recurring'}
                        </CardDescription>
                      </div>
                      <StatusBadge status={u.status}>
                        {budgetStatusLabel(u.status)}
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <BudgetProgress
                      utilization={u.utilization}
                      status={u.status}
                    />
                    <div className="flex justify-between text-sm">
                      <span>
                        {fmt(u.spent)} / {fmt(Number(b.amount))}
                      </span>
                      <span className="text-muted-foreground">{u.utilization}%</span>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setEdit(b);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={pending && actionKey !== `delete:${b.id}`}
                          isLoading={actionKey === `delete:${b.id}`}
                          loadingText="Deleting..."
                          onClick={() => deleteBudget(b.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <BudgetDialog
        budget={edit}
        categories={categories}
        open={open}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
