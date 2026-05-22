'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/categories/icons';
import type { ExpenseCategory } from '@/lib/database.types';

export function CategorySelector({
  categories,
  value,
  onChange,
  recentIds = [],
  disabled,
}: {
  categories: ExpenseCategory[];
  value: string | null;
  onChange: (id: string | null) => void;
  recentIds?: string[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === value);
  const defaultCat = categories.find((c) => c.slug === 'miscellaneous');

  const recent = useMemo(
    () =>
      recentIds
        .map((id) => categories.find((c) => c.id === id))
        .filter(Boolean) as ExpenseCategory[],
    [recentIds, categories],
  );

  const Icon = selected ? getCategoryIcon(selected.icon) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            {selected && Icon ? (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: selected.color }}
                />
                <Icon className="w-4 h-4 shrink-0" style={{ color: selected.color }} />
                {selected.name}
              </>
            ) : (
              'Select category'
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            {recent.length > 0 && (
              <CommandGroup heading="Recent">
                {recent.map((cat) => {
                  const CatIcon = getCategoryIcon(cat.icon);
                  return (
                    <CommandItem
                      key={`recent-${cat.id}`}
                      value={cat.name}
                      onSelect={() => {
                        onChange(cat.id);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', value === cat.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                      <CatIcon className="w-4 h-4 mr-2" style={{ color: cat.color }} />
                      {cat.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandGroup heading="All categories">
              {categories.map((cat) => {
                const CatIcon = getCategoryIcon(cat.icon);
                return (
                  <CommandItem
                    key={cat.id}
                    value={cat.name}
                    onSelect={() => {
                      onChange(cat.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === cat.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                    <CatIcon className="w-4 h-4 mr-2" style={{ color: cat.color }} />
                    {cat.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {defaultCat && value !== defaultCat.id && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                onChange(defaultCat.id);
                setOpen(false);
              }}
            >
              Use default (Miscellaneous)
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
