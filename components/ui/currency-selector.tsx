'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { CURRENCIES, type CurrencyCode } from '@/lib/currency';
import { cn } from '@/lib/utils';
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
import { Spinner } from '@/components/ui/spinner';

export function CurrencySelector({
  value,
  onChange,
  disabled,
  pending,
  className,
}: {
  value: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
  disabled?: boolean;
  pending?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => CURRENCIES.find((c) => c.code === value) ?? CURRENCIES[0], [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || pending}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate">
            {selected.flag} {selected.code} — {selected.name}
          </span>
          {pending ? (
            <Spinner className="ml-2 shrink-0" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {CURRENCIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.code} ${c.name} ${c.symbol}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === c.code ? 'opacity-100' : 'opacity-0')}
                  />
                  <span>
                    {c.flag} {c.code} — {c.name}
                  </span>
                  <span className="ml-auto text-muted-foreground text-xs">{c.symbol}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
