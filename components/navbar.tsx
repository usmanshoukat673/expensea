'use client';

import { useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  ExternalLink,
  Home,
  LogOut,
  Menu,
  Settings,
  Share2,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/branding/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TeamSwitcher } from '@/components/team/team-switcher';
import type { AppLayoutUser } from '@/components/app-layout';
import type { TeamRole } from '@/lib/database.types';

const headerIconButtonClass =
  'text-foreground hover:bg-accent hover:text-accent-foreground hover:translate-y-0 active:scale-100 dark:hover:bg-accent/20 dark:hover:text-accent-foreground';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/entries', icon: BookOpen, label: 'Entries' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/activity', icon: Activity, label: 'Activity' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings/profile', icon: Settings, label: 'Settings' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Navbar({
  user,
  role,
  notificationBell,
}: {
  user: AppLayoutUser;
  teamName: string;
  role: TeamRole | null;
  notificationBell?: ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const canManage = role === 'owner' || role === 'admin';
  const visibleNavItems = canManage
    ? navItems
    : navItems.filter((item) => item.href !== '/team');
  const initials = getInitials(user.name);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-sidebar-border bg-sidebar md:hidden">
      <div className="flex h-full items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <BrandLogo showName={false} size="sm" />
          <TeamSwitcher variant="navbar" />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {notificationBell}
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-accent"
            aria-label="Menu"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {isOpen && (
        <nav className="absolute left-0 right-0 top-16 max-h-[calc(100dvh-4rem)] space-y-1 overflow-y-auto border-b border-sidebar-border bg-sidebar px-4 py-4 shadow-lg">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium leading-none',
                  isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground',
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

export function DesktopHeader({
  user,
  teamSlug,
  teamId,
  notificationBell,
  className,
}: {
  user: AppLayoutUser;
  teamSlug?: string;
  teamId: string;
  notificationBell?: ReactNode;
  className?: string;
}) {
  const initials = getInitials(user.name);
  const [pendingSignOut, startSignOut] = useTransition();

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 hidden h-[72px] items-center border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:flex',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <TeamSwitcher variant="navbar" className="max-w-[260px]" />
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Public sharing links"
              className={headerIconButtonClass}
            >
              <Share2 className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Public links</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/public/team/${teamId}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Public page
              </Link>
            </DropdownMenuItem>
            {teamSlug && (
              <DropdownMenuItem asChild>
                <Link href={`/share/${teamSlug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Share by slug
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle className={headerIconButtonClass} />
        {notificationBell}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-10 rounded-full', headerIconButtonClass)}
              aria-label="Open account menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex min-w-0 items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">
                <UserCircle className="size-4" />
                Profile settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={pendingSignOut}
              variant="destructive"
              onSelect={() => startSignOut(() => signOut())}
            >
              <LogOut className="size-4" />
              {pendingSignOut ? 'Signing out...' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
