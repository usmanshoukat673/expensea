'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { BookOpen, Home, Plus, Settings, Users, BarChart3 } from 'lucide-react';

export function CommandPalette({ canEdit }: { canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey) && e.shiftKey && canEdit) {
        e.preventDefault();
        const onEntries =
          window.location.pathname === '/entries' ||
          window.location.pathname.startsWith('/entries/');
        if (onEntries) {
          window.dispatchEvent(new CustomEvent('open-lunch-modal'));
        } else {
          router.push('/entries?add=1');
        }
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggle, canEdit, router]);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go('/')}>
            <Home className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go('/entries')}>
            <BookOpen className="mr-2 h-4 w-4" /> Entries
          </CommandItem>
          <CommandItem onSelect={() => go('/team')}>
            <Users className="mr-2 h-4 w-4" /> Team
          </CommandItem>
          <CommandItem onSelect={() => go('/analytics')}>
            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
          </CommandItem>
          <CommandItem onSelect={() => go('/settings/profile')}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>
        {canEdit && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  const onEntries =
                    window.location.pathname === '/entries' ||
                    window.location.pathname.startsWith('/entries/');
                  if (onEntries) {
                    window.dispatchEvent(new CustomEvent('open-lunch-modal'));
                  } else {
                    router.push('/entries?add=1');
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add expense
                <span className="ml-auto text-xs text-muted-foreground">⌘⇧N</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
