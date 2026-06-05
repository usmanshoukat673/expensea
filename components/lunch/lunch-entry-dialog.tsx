'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createLunchEntry, updateLunchEntry } from '@/lib/actions/lunch-entries';
import { lunchEntrySchema, type LunchEntryInput } from '@/lib/validations';
import type { ExpenseCategory, LunchEntryWithProfile } from '@/lib/database.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCurrency } from '@/hooks/use-currency';
import { CategorySelector } from '@/components/categories/category-selector';

type Member = { user_id: string; name: string };

export function LunchEntryDialog({
  members,
  categories,
  recentCategoryIds = [],
  entry,
  open,
  onOpenChange,
  defaultLunchDate,
}: {
  members: Member[];
  categories: ExpenseCategory[];
  recentCategoryIds?: string[];
  entry?: LunchEntryWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLunchDate: string;
}) {
  const [pending, startTransition] = useTransition();
  const { currency } = useCurrency();
  const isEdit = !!entry;
  const defaultCategory =
    categories.find((c) => c.slug === 'miscellaneous') ?? categories[0];

  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LunchEntryInput>({
    resolver: zodResolver(lunchEntrySchema),
    defaultValues: {
      userId: entry?.user_id ?? members[0]?.user_id ?? '',
      amount: entry ? Number(entry.amount) : 0,
      lunchDate: entry?.lunch_date ?? defaultLunchDate,
      notes: entry?.notes ?? '',
      paymentStatus: entry?.payment_status ?? 'unpaid',
      categoryId: entry?.category_id ?? defaultCategory?.id ?? null,
      isShared: entry?.is_shared ?? false,
      splitType: entry?.split_type ?? 'equal',
      assignmentType: entry?.assignment_type ?? 'team',
      assignedUserId: entry?.assigned_user_id ?? null,
    },
  });

  const isShared = watch('isShared');
  const splitType = watch('splitType');
  const payerId = watch('userId');
  const categoryId = watch('categoryId');
  const assignmentType = watch('assignmentType') ?? 'team';
  const assignedUserId = watch('assignedUserId');

  useEffect(() => {
    if (entry) {
      reset({
        userId: entry.user_id,
        amount: Number(entry.amount),
        lunchDate: entry.lunch_date,
        notes: entry.notes ?? '',
        paymentStatus: entry.payment_status,
        categoryId: entry.category_id ?? defaultCategory?.id ?? null,
        isShared: entry.is_shared ?? false,
        splitType: entry.split_type ?? 'equal',
        assignmentType: entry.assignment_type ?? 'team',
        assignedUserId: entry.assigned_user_id ?? null,
      });
      setParticipantIds(
        entry.lunch_entry_participants?.map((p) => p.user_id) ?? [],
      );
    }
  }, [entry, reset, defaultCategory?.id]);

  useEffect(() => {
    const handler = () => onOpenChange(true);
    window.addEventListener('open-lunch-modal', handler);
    return () => window.removeEventListener('open-lunch-modal', handler);
  }, [onOpenChange]);

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submitExpense = (intent: 'draft' | 'submit') => handleSubmit((data) => {
    const fd = new FormData();
    fd.set('userId', data.userId);
    fd.set('amount', String(data.amount));
    fd.set('lunchDate', data.lunchDate);
    fd.set('notes', data.notes ?? '');
    fd.set('paymentStatus', data.paymentStatus);
    fd.set('categoryId', data.categoryId ?? '');
    fd.set('isShared', String(!!data.isShared));
    fd.set('splitType', data.isShared ? (data.splitType ?? 'equal') : 'none');
    fd.set('assignmentType', data.assignmentType ?? 'team');
    fd.set('assignedUserId', data.assignmentType === 'individual' ? (data.assignedUserId ?? '') : '');
    fd.set('participantIds', JSON.stringify(participantIds));
    fd.set('intent', intent);
    startTransition(async () => {
      const result = isEdit
        ? await updateLunchEntry(entry!.id, fd)
        : await createLunchEntry(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(isEdit ? 'Entry updated' : intent === 'submit' ? 'Submitted for approval' : 'Draft saved');
        onOpenChange(false);
        reset();
        setParticipantIds([]);
      }
    });
  })();

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/80 shadow-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <Label>Paid by</Label>
            <Select value={payerId} onValueChange={(v) => setValue('userId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelector
              categories={categories}
              value={categoryId ?? null}
              onChange={(id) => setValue('categoryId', id)}
              recentIds={recentCategoryIds}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <Label>Assignment</Label>
            <RadioGroup
              value={assignmentType}
              onValueChange={(value) => {
                setValue('assignmentType', value as 'team' | 'individual');
                if (value === 'team') setValue('assignedUserId', null);
                else if (!assignedUserId) setValue('assignedUserId', payerId);
              }}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <RadioGroupItem value="team" />
                Team expense
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <RadioGroupItem value="individual" />
                Individual expense
              </label>
            </RadioGroup>
            {assignmentType === 'individual' && (
              <div className="space-y-2">
                <Label>Assigned to</Label>
                <Select
                  value={assignedUserId ?? ''}
                  onValueChange={(v) => setValue('assignedUserId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assignedUserId && <p className="text-sm text-destructive">{errors.assignedUserId.message}</p>}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({currency.symbol})</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lunchDate">Date</Label>
              <Input id="lunchDate" type="date" {...register('lunchDate')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isShared"
              checked={!!isShared}
              onCheckedChange={(v) => setValue('isShared', !!v)}
            />
            <Label htmlFor="isShared" className="font-normal cursor-pointer">
              Shared expense (split with members)
            </Label>
          </div>

          {isShared && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="space-y-2">
                <Label>Split type</Label>
                <Select
                  value={splitType ?? 'equal'}
                  onValueChange={(v) => setValue('splitType', v as 'equal' | 'selected')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Split equally</SelectItem>
                    <SelectItem value="selected">Split among selected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Participants</Label>
                <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                  {members.map((m) => (
                    <label
                      key={m.user_id}
                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={participantIds.includes(m.user_id)}
                        onCheckedChange={() => toggleParticipant(m.user_id)}
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
                {isShared && participantIds.length > 0 && watch('amount') > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Each owes{' '}
                    {(
                      Number(watch('amount')) /
                      (participantIds.includes(payerId)
                        ? participantIds.length
                        : participantIds.length + 1)
                    ).toFixed(2)}{' '}
                    {currency.symbol}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment status</Label>
            <Select
              value={watch('paymentStatus')}
              onValueChange={(v) => setValue('paymentStatus', v as 'paid' | 'unpaid')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>
          {selectedCategory && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: selectedCategory.color }}
              />
              {selectedCategory.name}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => submitExpense('draft')}>
              {pending ? <Spinner /> : null}
              {isEdit ? 'Save changes' : 'Save draft'}
            </Button>
            {!isEdit && (
              <Button type="button" disabled={pending} onClick={() => submitExpense('submit')}>
                {pending ? <Spinner /> : null}
                Submit
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useLunchEntryModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-lunch-modal', handler);
    return () => window.removeEventListener('open-lunch-modal', handler);
  }, []);

  return { open, setOpen };
}
