'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createLunchEntry, updateLunchEntry } from '@/lib/actions/lunch-entries';
import { lunchEntrySchema, type LunchEntryInput } from '@/lib/validations';
import type { LunchEntryWithProfile } from '@/lib/database.types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCurrency } from '@/hooks/use-currency';

type Member = { user_id: string; name: string };

export function LunchEntryDialog({
  members,
  entry,
  open,
  onOpenChange,
  defaultLunchDate,
}: {
  members: Member[];
  entry?: LunchEntryWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLunchDate: string;
}) {
  const [pending, startTransition] = useTransition();
  const { currency } = useCurrency();
  const isEdit = !!entry;

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
    },
  });

  useEffect(() => {
    if (entry) {
      reset({
        userId: entry.user_id,
        amount: Number(entry.amount),
        lunchDate: entry.lunch_date,
        notes: entry.notes ?? '',
        paymentStatus: entry.payment_status,
      });
    }
  }, [entry, reset]);

  useEffect(() => {
    const handler = () => onOpenChange(true);
    window.addEventListener('open-lunch-modal', handler);
    return () => window.removeEventListener('open-lunch-modal', handler);
  }, [onOpenChange]);

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('userId', data.userId);
    fd.set('amount', String(data.amount));
    fd.set('lunchDate', data.lunchDate);
    fd.set('notes', data.notes ?? '');
    fd.set('paymentStatus', data.paymentStatus);
    startTransition(async () => {
      const result = isEdit
        ? await updateLunchEntry(entry!.id, fd)
        : await createLunchEntry(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(isEdit ? 'Entry updated' : 'Entry added');
        onOpenChange(false);
        reset();
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/80 shadow-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Member</Label>
            <Select value={watch('userId')} onValueChange={(v) => setValue('userId', v)}>
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
