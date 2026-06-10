'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
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
import { MoneyInput } from '@/components/ui/money-input';
import { RequiredLabel } from '@/components/ui/required-label';
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
import { useCurrency } from '@/hooks/use-currency';
import { CategorySelector } from '@/components/categories/category-selector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Member = { user_id: string; name: string; avatar_url?: string | null };

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
  const [pendingIntent, setPendingIntent] = useState<'draft' | 'submit' | null>(null);
  const router = useRouter();
  const { currency, format } = useCurrency();
  const isEdit = !!entry;
  const defaultCategory =
    categories.find((c) => c.slug === 'miscellaneous') ?? categories[0];

  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantShares, setParticipantShares] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<LunchEntryInput>({
    resolver: zodResolver(lunchEntrySchema),
    mode: 'onChange',
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
  const amount = Number(watch('amount') ?? 0);
  const sharedEnabled = assignmentType === 'team' && !!isShared;
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => member.name.toLowerCase().includes(q));
  }, [memberSearch, members]);
  const selectedParticipantCount = participantIds.length;
  const equalShare =
    sharedEnabled && splitType === 'equal' && selectedParticipantCount > 0 && amount > 0
      ? amount / selectedParticipantCount
      : 0;
  const customTotal = participantIds.reduce(
    (sum, id) => sum + Number(participantShares[id] || 0),
    0,
  );
  const customSplitMismatch =
    sharedEnabled && splitType === 'selected' && amount > 0 && Math.abs(customTotal - amount) > 0.01;

  useEffect(() => {
    if (!open) return;

    if (!entry) {
      reset({
        userId: members[0]?.user_id ?? '',
        amount: 0,
        lunchDate: defaultLunchDate,
        notes: '',
        paymentStatus: 'unpaid',
        categoryId: defaultCategory?.id ?? null,
        isShared: false,
        splitType: 'equal',
        assignmentType: 'team',
        assignedUserId: null,
        participantIds: [],
      });
      setParticipantIds([]);
      setParticipantShares({});
      setMemberSearch('');
      return;
    }

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
      participantIds: entry.lunch_entry_participants?.map((p) => p.user_id) ?? [],
    });
    setParticipantIds(
      entry.lunch_entry_participants?.map((p) => p.user_id) ?? [],
    );
    setParticipantShares(
      Object.fromEntries(
        (entry.lunch_entry_participants ?? [])
          .filter((p) => p.share_amount != null)
          .map((p) => [p.user_id, String(p.share_amount)]),
      ),
    );
    setMemberSearch('');
  }, [entry, open, reset, defaultCategory?.id, defaultLunchDate, members]);

  useEffect(() => {
    if (assignmentType !== 'individual') return;
    setValue('isShared', false);
    setValue('splitType', 'none');
    setParticipantIds([]);
    setParticipantShares({});
    if (!assignedUserId) setValue('assignedUserId', payerId);
  }, [assignmentType, assignedUserId, payerId, setValue]);

  useEffect(() => {
    if (isEdit) return;
    if (assignmentType !== 'team' || !isShared || splitType !== 'equal') return;
    setParticipantIds(members.map((member) => member.user_id));
    setParticipantShares({});
  }, [assignmentType, isShared, splitType, members, isEdit]);

  useEffect(() => {
    setValue('participantIds', sharedEnabled ? participantIds : [], {
      shouldValidate: sharedEnabled,
    });
  }, [participantIds, setValue, sharedEnabled]);

  useEffect(() => {
    const handler = () => onOpenChange(true);
    window.addEventListener('open-lunch-modal', handler);
    return () => window.removeEventListener('open-lunch-modal', handler);
  }, [onOpenChange]);

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) => {
      if (prev.includes(id)) {
        setParticipantShares((shares) => {
          const next = { ...shares };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const selectAllParticipants = () => setParticipantIds(members.map((member) => member.user_id));
  const deselectAllParticipants = () => {
    setParticipantIds([]);
    setParticipantShares({});
  };

  const updateParticipantShare = (userId: string, value: string) => {
    setParticipantShares((shares) => ({ ...shares, [userId]: value }));
  };

  const submitExpense = (intent: 'draft' | 'submit') => {
    setValue('participantIds', sharedEnabled ? participantIds : [], {
      shouldValidate: true,
    });

    if (customSplitMismatch) {
      toast.error('Total split must equal expense amount');
      return;
    }

    return handleSubmit((data) => {
      const fd = new FormData();
      fd.set('userId', data.userId);
      fd.set('amount', String(data.amount));
      fd.set('lunchDate', data.lunchDate);
      fd.set('notes', data.notes ?? '');
      fd.set('paymentStatus', data.paymentStatus);
      fd.set('categoryId', data.categoryId ?? '');
      const isTeamExpense = data.assignmentType !== 'individual';
      fd.set('isShared', String(isTeamExpense && !!data.isShared));
      fd.set('splitType', isTeamExpense && data.isShared ? (data.splitType ?? 'equal') : 'none');
      fd.set('assignmentType', data.assignmentType ?? 'team');
      fd.set('assignedUserId', data.assignmentType === 'individual' ? (data.assignedUserId ?? '') : '');
      fd.set('participantIds', JSON.stringify(isTeamExpense && data.isShared ? participantIds : []));
      fd.set('participantShares', JSON.stringify(data.splitType === 'selected' ? participantShares : {}));
      fd.set('intent', intent);
      setPendingIntent(intent);
      startTransition(async () => {
        try {
          const result = isEdit
            ? await updateLunchEntry(entry!.id, fd)
            : await createLunchEntry(fd);
          if (result?.error) toast.error(result.error);
          else {
            toast.success(isEdit ? 'Entry updated' : intent === 'submit' ? 'Submitted for approval' : 'Draft saved');
            router.refresh();
            onOpenChange(false);
            reset();
            setParticipantIds([]);
          }
        } finally {
          setPendingIntent(null);
        }
      });
    })();
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/80 shadow-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel required>Paid by</RequiredLabel>
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
            <RequiredLabel required>Category</RequiredLabel>
            <CategorySelector
              categories={categories}
              value={categoryId ?? null}
              onChange={(id) => setValue('categoryId', id)}
              recentIds={recentCategoryIds}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <RequiredLabel required>Assignment</RequiredLabel>
            <RadioGroup
              value={assignmentType}
              onValueChange={(value) => {
                setValue('assignmentType', value as 'team' | 'individual');
                if (value === 'team') {
                  setValue('assignedUserId', null);
                } else {
                  setValue('isShared', false);
                  setValue('splitType', 'none');
                  setValue('assignedUserId', assignedUserId || payerId);
                  setParticipantIds([]);
                  setParticipantShares({});
                }
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
                <RequiredLabel required>Assigned to</RequiredLabel>
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
              <RequiredLabel htmlFor="amount" required>Amount ({currency.symbol})</RequiredLabel>
              <MoneyInput
                id="amount"
                {...register('amount')}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <RequiredLabel htmlFor="lunchDate" required>Date</RequiredLabel>
              <Input id="lunchDate" type="date" {...register('lunchDate')} />
            </div>
          </div>

          {assignmentType === 'team' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="isShared"
                checked={!!isShared}
                onCheckedChange={(v) => {
                  const checked = !!v;
                  setValue('isShared', checked);
                  setValue('splitType', checked ? 'equal' : 'none');
                  if (checked) selectAllParticipants();
                  else deselectAllParticipants();
                }}
              />
              <Label htmlFor="isShared" className="font-normal cursor-pointer">
                Shared expense (split with members)
              </Label>
            </div>
          )}

          {sharedEnabled && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="space-y-2">
                <RequiredLabel required>Split type</RequiredLabel>
                <Select
                  value={splitType ?? 'equal'}
                  onValueChange={(v) => {
                    setValue('splitType', v as 'equal' | 'selected');
                    if (v === 'equal') {
                      selectAllParticipants();
                      setParticipantShares({});
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Split equally</SelectItem>
                    <SelectItem value="selected">Custom split</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <RequiredLabel required>Participants</RequiredLabel>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={selectAllParticipants}>
                      Select all
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={deselectAllParticipants}>
                      Deselect all
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search members"
                    className="pl-9"
                  />
                </div>
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {filteredMembers.map((m) => (
                    <label
                      key={m.user_id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    >
                      <Checkbox
                        checked={participantIds.includes(m.user_id)}
                        onCheckedChange={() => toggleParticipant(m.user_id)}
                      />
                      <Avatar className="size-7">
                        <AvatarImage src={m.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {m.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      {splitType === 'selected' && participantIds.includes(m.user_id) && (
                        <MoneyInput
                          value={participantShares[m.user_id] ?? ''}
                          onChange={(event) => updateParticipantShare(m.user_id, event.target.value)}
                          placeholder="Amount"
                          className="h-8 w-24"
                          onClick={(event) => event.preventDefault()}
                        />
                      )}
                    </label>
                  ))}
                </div>
                {sharedEnabled && splitType === 'equal' && equalShare > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Each selected member owes {format(equalShare)}.
                  </p>
                )}
                {sharedEnabled && splitType === 'selected' && (
                  <p className="text-xs text-muted-foreground">
                    Custom shares total {format(customTotal)} of {format(amount)}.
                  </p>
                )}
                {customSplitMismatch && (
                  <p className="text-sm text-destructive">
                    Total split must equal expense amount.
                  </p>
                )}
                {errors.participantIds && (
                  <p className="text-sm text-destructive">{errors.participantIds.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <RequiredLabel required>Payment status</RequiredLabel>
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
            <RequiredLabel htmlFor="notes" optional>Notes</RequiredLabel>
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
            <Button
              type="button"
              variant="outline"
              disabled={pending || !isValid || customSplitMismatch}
              isLoading={pendingIntent === 'draft'}
              loadingText={isEdit ? 'Saving changes...' : 'Saving draft...'}
              onClick={() => submitExpense('draft')}
            >
              {isEdit ? 'Save changes' : 'Save draft'}
            </Button>
            {!isEdit && (
              <Button
                type="button"
                disabled={!isValid || customSplitMismatch || pending}
                isLoading={pendingIntent === 'submit'}
                loadingText="Submitting..."
                onClick={() => submitExpense('submit')}
              >
                Submit for approval
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
