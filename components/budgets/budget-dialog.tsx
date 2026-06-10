'use client';

import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createTeamBudget, updateTeamBudget } from '@/lib/actions/team-budgets';
import { budgetSchema, type BudgetInput } from '@/lib/validations';
import type { ExpenseCategory, TeamBudget } from '@/lib/database.types';
import { useCurrency } from '@/hooks/use-currency';
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

function monthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [
    { value: 'recurring', label: 'Every month (recurring)' },
  ];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = format(d, 'yyyy-MM');
    opts.push({ value, label: format(d, 'MMMM yyyy') });
  }
  return opts;
}

function budgetToForm(budget?: TeamBudget | null): BudgetInput {
  if (!budget) {
    return { type: 'monthly', categoryId: null, amount: 0, month: 'recurring' };
  }
  return {
    type: budget.type,
    categoryId: budget.category_id,
    amount: Number(budget.amount),
    month: budget.month ? budget.month.slice(0, 7) : 'recurring',
  };
}

export function BudgetDialog({
  budget,
  categories,
  open,
  onOpenChange,
}: {
  budget?: TeamBudget | null;
  categories: ExpenseCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!budget;
  const { currency } = useCurrency();
  const months = monthOptions();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    mode: 'onChange',
    defaultValues: budgetToForm(budget),
  });

  useEffect(() => {
    if (!open) return;
    reset(budgetToForm(budget));
  }, [budget, open, reset]);

  const budgetType = watch('type');

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('type', data.type);
    fd.set('amount', String(data.amount));
    fd.set('month', data.month ?? 'recurring');
    if (data.type === 'category' && data.categoryId) {
      fd.set('categoryId', data.categoryId);
    }
    startTransition(async () => {
      const result = isEdit
        ? await updateTeamBudget(budget!.id, fd)
        : await createTeamBudget(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(isEdit ? 'Budget updated successfully.' : 'Budget created successfully.');
        onOpenChange(false);
        reset(budgetToForm(null));
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit budget' : 'Create budget'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel required>Budget type</RequiredLabel>
            <Select
              value={budgetType}
              onValueChange={(v: 'monthly' | 'category') => {
                setValue('type', v);
                if (v === 'monthly') setValue('categoryId', null);
              }}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly team budget</SelectItem>
                <SelectItem value="category">Category budget</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {budgetType === 'category' && (
            <div className="space-y-2">
              <RequiredLabel required>Category</RequiredLabel>
              <Select
                value={watch('categoryId') ?? ''}
                onValueChange={(v) => setValue('categoryId', v)}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <RequiredLabel required>Amount</RequiredLabel>
            <MoneyInput {...register('amount')} />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <RequiredLabel>Currency</RequiredLabel>
            <Input
              value={`${currency.flag} ${currency.code}`}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <RequiredLabel required>Month</RequiredLabel>
            <Select
              value={watch('month') ?? 'recurring'}
              onValueChange={(v) => setValue('month', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isValid}
            isLoading={pending}
            loadingText={isEdit ? 'Saving budget...' : 'Creating budget...'}
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
