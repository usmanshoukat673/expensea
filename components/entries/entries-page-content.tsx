'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntriesTable } from '@/components/entries/entries-table';
import { LunchEntryDialog, useLunchEntryModal } from '@/components/lunch/lunch-entry-dialog';
import type { ExpenseCategory, LunchEntryWithProfile } from '@/lib/database.types';
import type { DateRangeValue } from '@/lib/date-ranges';
import { DateRangeFilter } from '@/components/filters/date-range-filter';

export function EntriesPageContent({
  entries,
  members,
  categories,
  recentCategoryIds = [],
  canCreateEntry,
  canManageEntries,
  currentUserId,
  defaultLunchDate,
  dateRange,
}: {
  entries: LunchEntryWithProfile[];
  members: { user_id: string; name: string }[];
  categories: ExpenseCategory[];
  recentCategoryIds?: string[];
  canCreateEntry: boolean;
  canManageEntries: boolean;
  currentUserId: string;
  defaultLunchDate: string;
  dateRange: DateRangeValue;
}) {
  const { open, setOpen } = useLunchEntryModal();
  const [editEntry, setEditEntry] = useState<LunchEntryWithProfile | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('add') === '1' && canCreateEntry) {
      setOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('add');
      const qs = params.toString();
      router.replace(qs ? `/entries?${qs}` : '/entries', { scroll: false });
    }
  }, [searchParams, canCreateEntry, setOpen, router]);

  useEffect(() => {
    const openAddModal = () => setEditEntry(null);
    window.addEventListener('open-lunch-modal', openAddModal);
    return () => window.removeEventListener('open-lunch-modal', openAddModal);
  }, []);

  const openAdd = () => {
    setEditEntry(null);
    setOpen(true);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setEditEntry(null);
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage team expense records for {dateRange.label}.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <DateRangeFilter range={dateRange} />
            {canCreateEntry && (
              <Button onClick={openAdd} className="w-full sm:w-auto shrink-0">
                <Plus className="size-4" />
                Add entry
              </Button>
            )}
          </div>
        </div>
      </div>

      <EntriesTable
        entries={entries}
        categories={categories}
        canManageEntries={canManageEntries}
        currentUserId={currentUserId}
        onOpenChange={handleOpenChange}
        onAddEntry={openAdd}
        onEditEntry={setEditEntry}
      />

      {canCreateEntry && (
        <LunchEntryDialog
          members={members}
          categories={categories}
          recentCategoryIds={recentCategoryIds}
          entry={editEntry}
          open={open}
          onOpenChange={handleOpenChange}
          defaultLunchDate={defaultLunchDate}
        />
      )}
    </div>
  );
}
