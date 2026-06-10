'use client';

import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createExpenseCategory, updateExpenseCategory } from '@/lib/actions/expense-categories';
import { categorySchema, type CategoryInput } from '@/lib/validations';
import type { ExpenseCategory } from '@/lib/database.types';
import { CATEGORY_ICON_OPTIONS, getCategoryIcon } from '@/lib/categories/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const EMPTY_CATEGORY_VALUES: CategoryInput = {
  name: '',
  icon: 'circle',
  color: '#6366f1',
  description: '',
};

export function CategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category?: ExpenseCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!category;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isValid } } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    mode: 'onChange',
    defaultValues: EMPTY_CATEGORY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    if (category) {
      reset({
        name: category.name,
        icon: category.icon,
        color: category.color,
        description: category.description ?? '',
      });
    } else {
      reset(EMPTY_CATEGORY_VALUES);
    }
  }, [category, open, reset]);

  const iconName = watch('icon');
  const color = watch('color');
  const PreviewIcon = getCategoryIcon(iconName);

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set('name', data.name);
    fd.set('icon', data.icon);
    fd.set('color', data.color);
    fd.set('description', data.description ?? '');
    startTransition(async () => {
      const result = isEdit
        ? await updateExpenseCategory(category!.id, fd)
        : await createExpenseCategory(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(isEdit ? 'Category updated successfully.' : 'Category created successfully.');
        onOpenChange(false);
        reset(EMPTY_CATEGORY_VALUES);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit category' : 'Add category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <PreviewIcon className="size-6 shrink-0" style={{ color }} />
            <span className="text-sm font-medium">{watch('name') || 'Preview'}</span>
          </div>
          <div className="space-y-2">
            <RequiredLabel required>Name</RequiredLabel>
            <Input {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <RequiredLabel required>Icon</RequiredLabel>
              <Select value={iconName} onValueChange={(v) => setValue('icon', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_ICON_OPTIONS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <RequiredLabel required>Color</RequiredLabel>
              <Input type="color" {...register('color')} className="h-10 p-1" />
            </div>
          </div>
          <div className="space-y-2">
            <RequiredLabel optional>Description</RequiredLabel>
            <Textarea rows={2} {...register('description')} />
          </div>
          <Button type="submit" className="w-full" disabled={pending || !isValid}>
            {pending ? <Spinner /> : null}
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
