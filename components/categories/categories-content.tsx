'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Plus, Search, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { deleteExpenseCategory } from '@/lib/actions/expense-categories';
import { getCategoryIcon } from '@/lib/categories/icons';
import type { ExpenseCategory } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { EmptyState } from '@/components/ui/empty-states';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export function CategoriesContent({
  categories,
  usageCounts,
  canEdit,
}: {
  categories: ExpenseCategory[];
  usageCounts: Record<string, number>;
  canEdit: boolean;
}) {
  const [items, setItems] = useState(categories);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ExpenseCategory | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(categories);
  }, [categories]);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    );
  }, [items, debounced]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Group expenses for analysis and reporting.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEdit(null); setOpen(true); }}>
            <Plus className="size-4" />
            Add category
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories"
          description="Create categories to organize team expenses."
          actionLabel={canEdit ? 'Add category' : undefined}
          onAction={canEdit ? () => setOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            const count = usageCounts[cat.id] ?? 0;
            return (
              <Card key={cat.id} className="hover-lift soft-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${cat.color}22` }}
                    >
                      <Icon className="size-5" style={{ color: cat.color }} />
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEdit(cat); setOpen(true); }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete category?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Entries will keep their data but lose this category link.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    const r = await deleteExpenseCategory(cat.id);
                                    if (r?.error) toast.error(r.error);
                                    else {
                                      setItems((prev) => prev.filter((c) => c.id !== cat.id));
                                      toast.success('Deleted');
                                    }
                                  })
                                }
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{cat.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {cat.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{count} expenses</Badge>
                  <span
                    className="ml-2 inline-block size-3 rounded-full align-middle"
                    style={{ backgroundColor: cat.color }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryDialog category={edit} open={open} onOpenChange={setOpen} />
    </div>
  );
}
