'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntriesTable } from '@/components/entries/entries-table';
import { LunchEntryDialog, useLunchEntryModal } from '@/components/lunch/lunch-entry-dialog';
import type { ExpenseCategory, LunchEntryWithProfile } from '@/lib/database.types';

export function EntriesPageContent({
  entries,
  members,
  categories,
  recentCategoryIds = [],
  canEdit,
  defaultLunchDate,
}: {
  entries: LunchEntryWithProfile[];
  members: { user_id: string; name: string }[];
  categories: ExpenseCategory[];
  recentCategoryIds?: string[];
  canEdit: boolean;
  defaultLunchDate: string;
}) {
  const { open, setOpen } = useLunchEntryModal();
  const [editEntry, setEditEntry] = useState<LunchEntryWithProfile | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('add') === '1' && canEdit) {
      setOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('add');
      const qs = params.toString();
      router.replace(qs ? `/entries?${qs}` : '/entries', { scroll: false });
    }
  }, [searchParams, canEdit, setOpen, router]);

  const openAdd = () => {
    setEditEntry(null);
    setOpen(true);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setEditEntry(null);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage team expense records with filters and export.
            </p>
          </div>
          {canEdit && (
            <Button onClick={openAdd} className="w-full sm:w-auto shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add entry
            </Button>
          )}
        </div>
      </div>

      <EntriesTable
        entries={entries}
        categories={categories}
        canEdit={canEdit}
        onOpenChange={handleOpenChange}
        onAddEntry={openAdd}
        onEditEntry={setEditEntry}
      />

      {canEdit && (
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
