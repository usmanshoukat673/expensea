'use client';

import { useEffect, useMemo, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createSettlement } from '@/lib/actions/settlements';
import { settlementSchema, type SettlementFormInput } from '@/lib/validations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { RequiredLabel } from '@/components/ui/required-label';
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

export function SettlementDialog({
  members,
  open,
  onOpenChange,
}: {
  members: { userId: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const { currency } = useCurrency();

  const defaultValues = useMemo<SettlementFormInput>(
    () => ({
      payerUserId: members[0]?.userId ?? '',
      receiverUserId: members[1]?.userId ?? members[0]?.userId ?? '',
      amount: 0,
      note: '',
      proofUrl: '',
    }),
    [members],
  );

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isValid } } = useForm<SettlementFormInput>({
    resolver: zodResolver(settlementSchema),
    mode: 'onChange',
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [defaultValues, open, reset]);

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('payerUserId', data.payerUserId);
    fd.set('receiverUserId', data.receiverUserId);
    fd.set('amount', String(data.amount));
    fd.set('note', data.note ?? '');
    fd.set('proofUrl', data.proofUrl ?? '');
    startTransition(async () => {
      const r = await createSettlement(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success('Settlement recorded successfully.');
        reset(defaultValues);
        onOpenChange(false);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record settlement</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel required>Who paid</RequiredLabel>
            <Select value={watch('payerUserId')} onValueChange={(v) => setValue('payerUserId', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <RequiredLabel required>Who receives</RequiredLabel>
            <Select value={watch('receiverUserId')} onValueChange={(v) => setValue('receiverUserId', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <RequiredLabel required>Amount ({currency.symbol})</RequiredLabel>
            <MoneyInput {...register('amount')} />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <RequiredLabel optional>Note</RequiredLabel>
            <Textarea rows={2} {...register('note')} />
          </div>
          <div className="space-y-2">
            <RequiredLabel optional>Proof URL</RequiredLabel>
            <Input type="url" placeholder="https://..." {...register('proofUrl')} />
          </div>
          <Button type="submit" className="w-full" disabled={pending || !isValid}>
            {pending ? <Spinner /> : null}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
