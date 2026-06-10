'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { CalendarClock, Pause, Pencil, Play, Plus, RotateCw, Trash2 } from 'lucide-react';
import type {
  ExpenseCategory,
  RecurringExpenseWithCategory,
} from '@/lib/database.types';
import {
  deleteRecurringExpense,
  processDueRecurringExpenses,
  setRecurringExpenseActive,
} from '@/lib/actions/recurring-expenses';
import { describeRecurringInterval } from '@/lib/recurring-expenses';
import { useCurrency } from '@/hooks/use-currency';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getCategoryIcon } from '@/lib/categories/icons';
import { RecurringExpenseDialog } from '@/components/recurring-expenses/recurring-expense-dialog';
import { Spinner } from '@/components/ui/spinner';

export function RecurringExpensesContent({
  recurringExpenses: initialRecurringExpenses,
  categories,
  canEdit,
  defaultStartDate,
}: {
  recurringExpenses: RecurringExpenseWithCategory[];
  categories: ExpenseCategory[];
  canEdit: boolean;
  defaultStartDate: string;
}) {
  const { format: formatCurrency } = useCurrency();
  const router = useRouter();
  const [recurringExpenses, setRecurringExpenses] = useState(initialRecurringExpenses);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editRule, setEditRule] = useState<RecurringExpenseWithCategory | null>(null);
  const [pending, startTransition] = useTransition();
  const [actionKey, setActionKey] = useState<string | null>(null);

  useEffect(() => {
    setRecurringExpenses(initialRecurringExpenses);
  }, [initialRecurringExpenses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return recurringExpenses;
    return recurringExpenses.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.expense_categories?.name.toLowerCase().includes(q) ?? false),
    );
  }, [recurringExpenses, search]);

  const openAdd = () => {
    setEditRule(null);
    setOpen(true);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setEditRule(null);
  };

  const toggleActive = (rule: RecurringExpenseWithCategory) => {
    setActionKey(`toggle:${rule.id}`);
    startTransition(async () => {
      try {
        const result = await setRecurringExpenseActive(rule.id, !rule.is_active);
        if (result?.error) toast.error(result.error);
        else {
          setRecurringExpenses((prev) =>
            prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)),
          );
          toast.success(rule.is_active ? 'Recurring expense paused' : 'Recurring expense resumed');
        }
      } finally {
        setActionKey(null);
      }
    });
  };

  const runDueRules = () => {
    setActionKey('run-due');
    startTransition(async () => {
      try {
        const result = await processDueRecurringExpenses();
        if (result?.error) toast.error(result.error);
        else {
          toast.success(`${result.generated ?? 0} recurring expense${result.generated === 1 ? '' : 's'} generated`);
          router.refresh();
        }
      } finally {
        setActionKey(null);
      }
    });
  };

  const deleteRule = (rule: RecurringExpenseWithCategory) => {
    setActionKey(`delete:${rule.id}`);
    startTransition(async () => {
      try {
        const result = await deleteRecurringExpense(rule.id);
        if (result?.error) toast.error(result.error);
        else {
          setRecurringExpenses((prev) =>
            prev.filter((r) => r.id !== rule.id),
          );
          toast.success('Recurring expense deleted');
        }
      } finally {
        setActionKey(null);
      }
    });
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recurring expenses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage automated expense rules for this team.
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={runDueRules}
                disabled={pending && actionKey !== 'run-due'}
                isLoading={actionKey === 'run-due'}
                loadingText="Running..."
              >
                <RotateCw className="size-4" />
                Run due
              </Button>
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                Create rule
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 max-w-md">
        <Input
          placeholder="Search rules or categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-background"
        />
      </div>

      <div className="relative min-h-[220px] min-w-0 overflow-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Next run</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((rule) => {
                const cat = rule.expense_categories;
                const Icon = cat ? getCategoryIcon(cat.icon) : CalendarClock;
                return (
                  <TableRow key={rule.id} className="hover:bg-accent/10 dark:hover:bg-muted/50">
                    <TableCell className="font-medium">{rule.title}</TableCell>
                    <TableCell>
                      {cat ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <Icon className="size-3.5 shrink-0" style={{ color: cat.color }} />
                          <span className="truncate">{cat.name}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(rule.amount))}</TableCell>
                    <TableCell>
                      {describeRecurringInterval(rule.frequency, rule.interval_value)}
                    </TableCell>
                    <TableCell>{format(parseISO(rule.next_run_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <StatusBadge status={rule.is_active ? 'active' : 'paused'} />
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pending && actionKey !== `toggle:${rule.id}`}
                            isLoading={actionKey === `toggle:${rule.id}`}
                            aria-label={rule.is_active ? 'Pause recurring expense' : 'Resume recurring expense'}
                            onClick={() => toggleActive(rule)}
                          >
                            {rule.is_active ? (
                              <Pause className="size-4" />
                            ) : (
                              <Play className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditRule(rule);
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
                                <AlertDialogTitle>Delete recurring expense?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Generated expenses will stay in your records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={pending && actionKey !== `delete:${rule.id}`}
                                  onClick={() => deleteRule(rule)}
                                >
                                  {actionKey === `delete:${rule.id}` ? <Spinner /> : null}
                                  {actionKey === `delete:${rule.id}` ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="h-40 p-0">
                  <Empty className="border-0 py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CalendarClock />
                      </EmptyMedia>
                      <EmptyTitle>No recurring expenses found</EmptyTitle>
                      <EmptyDescription>
                        {search
                          ? 'Try adjusting your search.'
                          : 'Create a rule for bills and repeat team costs.'}
                      </EmptyDescription>
                    </EmptyHeader>
                    {canEdit && !search && (
                      <Button size="sm" className="mt-2" onClick={openAdd}>
                        Create rule
                      </Button>
                    )}
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <RecurringExpenseDialog
          categories={categories}
          recurringExpense={editRule}
          open={open}
          onOpenChange={handleOpenChange}
          defaultStartDate={defaultStartDate}
        />
      )}
    </div>
  );
}
