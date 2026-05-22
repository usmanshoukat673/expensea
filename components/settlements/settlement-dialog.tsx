'use client';

import { useTransition } from 'react';
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

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SettlementFormInput>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      payerUserId: members[0]?.userId ?? '',
      receiverUserId: members[1]?.userId ?? members[0]?.userId ?? '',
      amount: 0,
      note: '',
      proofUrl: '',
    },
  });

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
        toast.success('Settlement recorded');
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
            <Label>Who paid</Label>
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
            <Label>Who receives</Label>
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
            <Label>Amount ({currency.symbol})</Label>
            <Input type="number" step="0.01" {...register('amount')} />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea rows={2} {...register('note')} />
          </div>
          <div className="space-y-2">
            <Label>Proof URL (optional)</Label>
            <Input type="url" placeholder="https://..." {...register('proofUrl')} />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Spinner className="mr-2" /> : null}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
