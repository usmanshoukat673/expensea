'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  createRecurringExpense,
  updateRecurringExpense,
} from '@/lib/actions/recurring-expenses';
import {
  recurringExpenseSchema,
  type RecurringExpenseInput,
} from '@/lib/validations';
import type {
  ExpenseCategory,
  RecurringExpenseWithCategory,
} from '@/lib/database.types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { CategorySelector } from '@/components/categories/category-selector';
import { useCurrency } from '@/hooks/use-currency';

export function RecurringExpenseDialog({
  categories,
  recurringExpense,
  open,
  onOpenChange,
  defaultStartDate,
}: {
  categories: ExpenseCategory[];
  recurringExpense?: RecurringExpenseWithCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStartDate: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { currency } = useCurrency();
  const isEdit = !!recurringExpense;
  const defaultCategory =
    categories.find((c) => c.slug === 'miscellaneous') ?? categories[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<RecurringExpenseInput>({
    resolver: zodResolver(recurringExpenseSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      amount: 0,
      categoryId: defaultCategory?.id ?? '',
      frequency: 'monthly',
      intervalValue: 1,
      startDate: defaultStartDate,
      endDate: '',
    },
  });

  useEffect(() => {
    reset({
      title: recurringExpense?.title ?? '',
      amount: recurringExpense ? Number(recurringExpense.amount) : 0,
      categoryId: recurringExpense?.category_id ?? defaultCategory?.id ?? '',
      frequency: recurringExpense?.frequency ?? 'monthly',
      intervalValue: recurringExpense?.interval_value ?? 1,
      startDate: recurringExpense?.start_date ?? defaultStartDate,
      endDate: recurringExpense?.end_date ?? '',
    });
  }, [recurringExpense, reset, defaultCategory?.id, defaultStartDate]);

  const categoryId = watch('categoryId');
  const frequency = watch('frequency');

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('title', data.title);
    fd.set('amount', String(data.amount));
    fd.set('categoryId', data.categoryId);
    fd.set('frequency', data.frequency);
    fd.set('intervalValue', String(data.intervalValue));
    fd.set('startDate', data.startDate);
    fd.set('endDate', data.endDate ?? '');

    startTransition(async () => {
      const result = isEdit
        ? await updateRecurringExpense(recurringExpense!.id, fd)
        : await createRecurringExpense(fd);

      if (result?.error) toast.error(result.error);
      else {
        toast.success(isEdit ? 'Recurring expense updated' : 'Recurring expense created');
        onOpenChange(false);
        router.refresh();
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/80 shadow-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit recurring expense' : 'Create recurring expense'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel htmlFor="title" required>Title</RequiredLabel>
            <Input id="title" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <RequiredLabel required>Category</RequiredLabel>
            <CategorySelector
              categories={categories}
              value={categoryId}
              onChange={(id) => setValue('categoryId', id ?? '')}
            />
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <RequiredLabel htmlFor="amount" required>Amount ({currency.symbol})</RequiredLabel>
              <MoneyInput id="amount" {...register('amount')} />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <RequiredLabel required>Frequency</RequiredLabel>
              <Select
                value={frequency}
                onValueChange={(v) =>
                  setValue('frequency', v as RecurringExpenseInput['frequency'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <RequiredLabel htmlFor="intervalValue" required>Every</RequiredLabel>
              <Input id="intervalValue" type="number" min="1" {...register('intervalValue')} />
              {errors.intervalValue && (
                <p className="text-sm text-destructive">
                  {errors.intervalValue.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <RequiredLabel htmlFor="startDate" required>Start date</RequiredLabel>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <RequiredLabel htmlFor="endDate" optional>End date</RequiredLabel>
            <Input id="endDate" type="date" {...register('endDate')} />
            {errors.endDate && (
              <p className="text-sm text-destructive">{errors.endDate.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={pending || !isValid}>
            {pending ? <Spinner /> : null}
            {isEdit ? 'Save changes' : 'Create rule'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
