'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const [pending, startTransition] = useTransition();

  const button = (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      aria-label={collapsed ? (pending ? 'Signing out' : 'Sign out') : undefined}
      aria-busy={pending || undefined}
      className={cn(
        'flex rounded-lg text-sm font-medium text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent/10 dark:hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        collapsed ? 'h-10 w-full items-center justify-center px-0' : 'w-full items-center gap-3 px-4 py-2.5'
      )}
    >
      {pending ? <Spinner className="size-5 shrink-0" /> : <LogOut className="size-5 shrink-0" />}
      {!collapsed && <span>{pending ? 'Signing out...' : 'Sign out'}</span>}
    </button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={10}>
        Sign out
      </TooltipContent>
    </Tooltip>
  );
}
