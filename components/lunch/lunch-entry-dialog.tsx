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
    },
  });

  const isShared = watch('isShared');
  const splitType = watch('splitType');
  const payerId = watch('userId');
  const categoryId = watch('categoryId');

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

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('userId', data.userId);
    fd.set('amount', String(data.amount));
    fd.set('lunchDate', data.lunchDate);
    fd.set('notes', data.notes ?? '');
    fd.set('paymentStatus', data.paymentStatus);
    fd.set('categoryId', data.categoryId ?? '');
    fd.set('isShared', String(!!data.isShared));
    fd.set('splitType', data.isShared ? (data.splitType ?? 'equal') : 'none');
    fd.set('participantIds', JSON.stringify(participantIds));
    startTransition(async () => {
      const result = isEdit
        ? await updateLunchEntry(entry!.id, fd)
        : await createLunchEntry(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(isEdit ? 'Entry updated' : 'Entry added');
        onOpenChange(false);
        reset();
        setParticipantIds([]);
      }
    });
  });

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/80 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
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
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedCategory.color }}
              />
              {selectedCategory.name}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Spinner className="mr-2" /> : null}
            {isEdit ? 'Save changes' : 'Add entry'}
          </Button>
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
