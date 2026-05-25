'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { useTeam } from '@/hooks/use-team';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import type { TeamRole } from '@/lib/database.types';

const roleLabels: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  viewer: 'Viewer',
};

function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] capitalize">
      {roleLabels[role]}
    </Badge>
  );
}

type TeamSwitcherProps = {
  variant?: 'sidebar' | 'navbar';
  className?: string;
};

export function TeamSwitcher({ variant = 'sidebar', className }: TeamSwitcherProps) {
  const { teams, activeTeam, activeTeamId, switching, switchToTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const [, startNav] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
    );
  }, [teams, query]);

  if (switching) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-9 w-full" />
        {variant === 'sidebar' && <Skeleton className="h-4 w-24" />}
      </div>
    );
  }

  const triggerLabel = activeTeam?.name ?? 'Select team';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-normal transition-all duration-200',
            variant === 'sidebar'
              ? 'w-full h-auto px-0 py-0 hover:bg-transparent text-left'
              : 'h-9 max-w-[200px] px-2 hover:bg-sidebar-accent',
            className
          )}
        >
          <span className="flex flex-col items-start min-w-0 flex-1">
            <span
              className={cn(
                'truncate font-semibold',
                variant === 'sidebar'
                  ? 'text-sm text-sidebar-foreground'
                  : 'text-sm text-sidebar-foreground'
              )}
            >
              {triggerLabel}
            </span>
            {variant === 'sidebar' && activeTeam && (
              <span className="text-xs text-sidebar-foreground/50 capitalize flex items-center gap-1.5 mt-0.5">
                <RoleBadge role={activeTeam.role} />
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,280px)] p-0"
        align={variant === 'navbar' ? 'end' : 'start'}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="size-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search teams..."
              value={query}
              onValueChange={setQuery}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup heading="Your teams">
              {filtered.map((team) => (
                <CommandItem
                  key={team.id}
                  value={team.id}
                  onSelect={() => {
                    setOpen(false);
                    setQuery('');
                    if (team.id !== activeTeamId) void switchToTeam(team.id);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="truncate font-medium">{team.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{team.slug}</span>
                  </div>
                  <RoleBadge role={team.role} />
                  <Check
                    className={cn(
                      'size-4 shrink-0',
                      activeTeamId === team.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  startNav(() => router.push('/create-team'));
                }}
              >
                <Plus className="size-4" />
                Create new team
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function TeamSwitcherCreateLink() {
  return (
    <Link
      href="/create-team"
      className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground hover:text-accent"
    >
      <Plus className="size-3" />
      New team
    </Link>
  );
}
