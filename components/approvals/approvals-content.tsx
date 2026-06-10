'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format as formatDate, parseISO } from 'date-fns';
import { Check, RotateCcw, X, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveExpense,
  recordExpenseReimbursement,
  rejectExpense,
  requestExpenseChanges,
} from '@/lib/actions/lunch-entries';
import type { ExpenseCategory, LunchEntryWithProfile, Profile } from '@/lib/database.types';
import type { DateRangeValue } from '@/lib/date-ranges';
import { useCurrency } from '@/hooks/use-currency';
import { DateRangeFilter } from '@/components/filters/date-range-filter';
import { FilterField, FilterSheet } from '@/components/filters/filter-sheet';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { RequiredLabel } from '@/components/ui/required-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type QueueEntry = LunchEntryWithProfile & {
  submitter?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  approver?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
};

type Queue = {
  pending: QueueEntry[];
  approved: QueueEntry[];
  rejected: QueueEntry[];
};

export function ApprovalsContent({
  queue,
  categories,
  submitters,
  dateRange,
  categoryFilter = 'all',
  submitterFilter = 'all',
  canReview,
}: {
  queue: Queue;
  categories: ExpenseCategory[];
  submitters: { id: string; name: string }[];
  dateRange: DateRangeValue;
  categoryFilter?: string;
  submitterFilter?: string;
  canReview: boolean;
}) {
  const { format } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [reasonEntry, setReasonEntry] = useState<{ entry: QueueEntry; mode: 'reject' | 'changes' } | null>(null);
  const [reimburseEntry, setReimburseEntry] = useState<QueueEntry | null>(null);
  const [categoryDraft, setCategoryDraft] = useState(categoryFilter);
  const [submitterDraft, setSubmitterDraft] = useState(submitterFilter);

  useEffect(() => {
    setCategoryDraft(categoryFilter);
    setSubmitterDraft(submitterFilter);
  }, [categoryFilter, submitterFilter]);

  const stats = useMemo(() => {
    const approvedOutstanding = queue.approved.reduce(
      (total, entry) => total + Math.max(0, Number(entry.amount) - Number(entry.amount_reimbursed ?? 0)),
      0,
    );
    return {
      pending: queue.pending.length,
      approved: queue.approved.length,
      rejected: queue.rejected.length,
      outstanding: approvedOutstanding,
    };
  }, [queue]);

  const runAction = (label: string, action: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
      else {
        router.refresh();
        toast.success(label);
      }
    });
  };

  const updateFilters = (category: string, submitter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'all') params.delete('category');
    else params.set('category', category);
    if (canReview && submitter !== 'all') params.set('submitter', submitter);
    else params.delete('submitter');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const activeFilterCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    (canReview && submitterFilter !== 'all' ? 1 : 0);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review submitted expenses for {dateRange.label}.</p>
        </div>
        <DateRangeFilter range={dateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Pending approvals" value={stats.pending} />
        <Metric title="Approved expenses" value={stats.approved} />
        <Metric title="Rejected expenses" value={stats.rejected} />
        <Metric title="Reimbursements outstanding" value={format(stats.outstanding)} />
      </div>

      <FilterSheet
        activeCount={activeFilterCount}
        title="Approval filters"
        description="Filter review queues by category and submitter."
        align="start"
        onReset={() => {
          setCategoryDraft('all');
          setSubmitterDraft('all');
          updateFilters('all', 'all');
        }}
        onApply={() => updateFilters(categoryDraft, submitterDraft)}
      >
        <FilterField label="Category">
          <Select value={categoryDraft} onValueChange={setCategoryDraft}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterField>
        {canReview && (
          <FilterField label="Submitter">
            <Select value={submitterDraft} onValueChange={setSubmitterDraft}>
              <SelectTrigger><SelectValue placeholder="Submitter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All submitters</SelectItem>
                {submitters.map((submitter) => <SelectItem key={submitter.id} value={submitter.id}>{submitter.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
        )}
      </FilterSheet>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <ApprovalTable
            entries={queue.pending}
            canReview={canReview}
            pending={pending}
            onApprove={(entry) => runAction('Expense approved', () => approveExpense(entry.id))}
            onReject={(entry) => setReasonEntry({ entry, mode: 'reject' })}
            onChanges={(entry) => setReasonEntry({ entry, mode: 'changes' })}
            onReimburse={(entry) => setReimburseEntry(entry)}
          />
        </TabsContent>
        <TabsContent value="approved">
          <ApprovalTable
            entries={queue.approved}
            canReview={canReview}
            pending={pending}
            onApprove={(entry) => runAction('Expense approved', () => approveExpense(entry.id))}
            onReject={(entry) => setReasonEntry({ entry, mode: 'reject' })}
            onChanges={(entry) => setReasonEntry({ entry, mode: 'changes' })}
            onReimburse={(entry) => setReimburseEntry(entry)}
          />
        </TabsContent>
        <TabsContent value="rejected">
          <ApprovalTable
            entries={queue.rejected}
            canReview={canReview}
            pending={pending}
            onApprove={(entry) => runAction('Expense approved', () => approveExpense(entry.id))}
            onReject={(entry) => setReasonEntry({ entry, mode: 'reject' })}
            onChanges={(entry) => setReasonEntry({ entry, mode: 'changes' })}
            onReimburse={(entry) => setReimburseEntry(entry)}
          />
        </TabsContent>
      </Tabs>

      <ReasonDialog
        state={reasonEntry}
        pending={pending}
        onOpenChange={(open) => !open && setReasonEntry(null)}
        onSubmit={(entry, mode, formData) =>
          runAction(mode === 'reject' ? 'Expense rejected' : 'Changes requested', () =>
            mode === 'reject' ? rejectExpense(entry.id, formData) : requestExpenseChanges(entry.id, formData),
          )
        }
      />
      <ReimbursementDialog
        entry={reimburseEntry}
        pending={pending}
        onOpenChange={(open) => !open && setReimburseEntry(null)}
        onSubmit={(entry, formData) =>
          runAction('Reimbursement recorded', () => recordExpenseReimbursement(entry.id, formData))
        }
      />
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ApprovalTable({
  entries,
  canReview,
  pending,
  onApprove,
  onReject,
  onChanges,
  onReimburse,
}: {
  entries: QueueEntry[];
  canReview: boolean;
  pending: boolean;
  onApprove: (entry: QueueEntry) => void;
  onReject: (entry: QueueEntry) => void;
  onChanges: (entry: QueueEntry) => void;
  onReimburse: (entry: QueueEntry) => void;
}) {
  const { format } = useCurrency();
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitter</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reimbursement</TableHead>
                {canReview && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length ? entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.submitter?.full_name ?? entry.profiles?.full_name ?? 'Member'}</TableCell>
                  <TableCell>{entry.expense_categories?.name ?? 'Uncategorized'}</TableCell>
                  <TableCell>{format(Number(entry.amount))}</TableCell>
                  <TableCell>{formatDate(parseISO(entry.lunch_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell><StatusBadge status={entry.approval_status} /></TableCell>
                  <TableCell>
                    <StatusBadge status={entry.reimbursement_status} />
                    <span className="block text-xs text-muted-foreground">{format(Number(entry.amount_reimbursed ?? 0))} reimbursed</span>
                  </TableCell>
                  {canReview && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {entry.approval_status === 'pending_approval' && (
                          <>
                            <Button size="icon" variant="ghost" disabled={pending} onClick={() => onApprove(entry)}><Check className="size-4" /></Button>
                            <Button size="icon" variant="ghost" disabled={pending} onClick={() => onChanges(entry)}><RotateCcw className="size-4" /></Button>
                            <Button size="icon" variant="ghost" disabled={pending} onClick={() => onReject(entry)}><X className="size-4" /></Button>
                          </>
                        )}
                        {['approved', 'reimbursed'].includes(entry.approval_status) && entry.reimbursement_status !== 'fully_reimbursed' && (
                          <Button size="icon" variant="ghost" disabled={pending} onClick={() => onReimburse(entry)}><WalletCards className="size-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={canReview ? 7 : 6} className="h-24 text-muted-foreground">No expenses in this queue.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ReasonDialog({
  state,
  pending,
  onOpenChange,
  onSubmit,
}: {
  state: { entry: QueueEntry; mode: 'reject' | 'changes' } | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: QueueEntry, mode: 'reject' | 'changes', formData: FormData) => void;
}) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= 3;

  useEffect(() => {
    setReason('');
  }, [state?.entry.id, state?.mode]);

  return (
    <Dialog open={!!state} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{state?.mode === 'reject' ? 'Reject expense' : 'Request changes'}</DialogTitle></DialogHeader>
        <form action={(formData) => {
          if (!isValid) {
            toast.error('Reason is required');
            return;
          }
          if (state) {
            onSubmit(state.entry, state.mode, formData);
            setReason('');
            onOpenChange(false);
          }
        }} className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel htmlFor="reason" required>Reason</RequiredLabel>
            <Textarea id="reason" name="reason" required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
            {!isValid && reason.length > 0 ? <p className="text-sm text-destructive">Reason is required</p> : null}
          </div>
          <Button disabled={pending || !isValid} type="submit">Submit</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReimbursementDialog({
  entry,
  pending,
  onOpenChange,
  onSubmit,
}: {
  entry: QueueEntry | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: QueueEntry, formData: FormData) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const remaining = entry
    ? Math.max(0, Number(entry.amount) - Number(entry.amount_reimbursed ?? 0))
    : 0;
  const numericAmount = Number(amount);
  const amountError =
    amount.length === 0
      ? 'This field is required'
      : !Number.isFinite(numericAmount) || numericAmount <= 0
        ? 'Amount must be greater than 0'
        : numericAmount > remaining
          ? 'Amount exceeds allowed limit'
          : null;

  useEffect(() => {
    setAmount('');
  }, [entry?.id]);

  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record reimbursement</DialogTitle></DialogHeader>
        <form action={(formData) => {
          if (amountError) {
            toast.error(amountError);
            return;
          }
          if (entry) {
            onSubmit(entry, formData);
            setAmount('');
            onOpenChange(false);
          }
        }} className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel htmlFor="amount" required>Amount</RequiredLabel>
            <MoneyInput
              id="amount"
              name="amount"
              required
              maxAmount={remaining}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            {amountError && amount.length > 0 ? <p className="text-sm text-destructive">{amountError}</p> : null}
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="reimbursedAt" required>Date</RequiredLabel>
            <Input id="reimbursedAt" name="reimbursedAt" type="date" defaultValue={today} required />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="notes" optional>Notes</RequiredLabel>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <Button disabled={pending || !!amountError} type="submit">Record reimbursement</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
