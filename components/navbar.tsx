'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Home,
  LogOut,
  Menu,
  PiggyBank,
  Scale,
  Settings,
  Share2,
  Tag,
  UserCircle,
  UserCog,
  UserRound,
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
  'text-foreground hover:bg-accent/10 hover:text-foreground hover:translate-y-0 active:scale-100 dark:hover:bg-muted/50 dark:hover:text-foreground';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/entries', icon: BookOpen, label: 'Entries' },
  { href: '/my-expenses', icon: UserRound, label: 'My Expenses' },
  { href: '/approvals', icon: ClipboardCheck, label: 'Approvals' },
  { href: '/recurring-expenses', icon: CalendarClock, label: 'Recurring' },
  { href: '/categories', icon: Tag, label: 'Categories' },
  { href: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { href: '/settlements', icon: Scale, label: 'Settlements' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/activity', icon: Activity, label: 'Activity' },
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings/profile', icon: Settings, label: 'Settings' },
];

const navSections = [
  {
    heading: 'Workspace',
    items: navItems.slice(0, 8),
  },
  {
    heading: 'Insights',
    items: navItems.slice(8, 11).concat(navItems[12]),
  },
  {
    heading: 'Account',
    items: [navItems[11], navItems[13]],
  },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function isNavItemActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/settings/profile') return pathname === href || pathname.startsWith('/settings/');
  if (href === '/team') return pathname === href || pathname === '/team/settings';
  return pathname === href || pathname.startsWith(`${href}/`);
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
  const [pendingSignOut, startSignOut] = useTransition();
  const canManage = role === 'owner' || role === 'admin';
  const visibleNavItems = canManage
    ? navItems
    : navItems.filter((item) => item.href !== '/team');
  const initials = getInitials(user.name);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-sidebar-border bg-sidebar md:hidden">
      <div className="flex h-full items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <BrandLogo showName={false} size="sm" />
          <TeamSwitcher variant="navbar" className="min-w-0 max-w-[min(42vw,200px)]" />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle className="size-9 hover:translate-y-0 active:scale-100" />
          {notificationBell}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full outline-none transition-colors hover:bg-sidebar-accent/10 focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-sidebar-accent/50"
                aria-label="Open account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar ?? undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(calc(100vw-1rem),16rem)]">
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
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex size-9 items-center justify-center rounded-lg transition-colors duration-200 ease-out hover:bg-sidebar-accent/10 dark:hover:bg-sidebar-accent/50"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation-menu"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {isOpen && (
        <nav
          id="mobile-navigation-menu"
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] top-16 flex min-h-0 flex-col border-b border-sidebar-border bg-sidebar shadow-lg"
          aria-label="Mobile navigation"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 overscroll-contain">
            {navSections.map((section) => {
              const items = section.items.filter((item) =>
                visibleNavItems.some((visibleItem) => visibleItem.href === item.href),
              );
              if (items.length === 0) return null;

              return (
                <div key={section.heading} className="space-y-1">
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-normal text-sidebar-foreground/45">
                    {section.heading}
                  </p>
                  {items.map((item) => {
                    const isActive = isNavItemActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/10 dark:hover:bg-sidebar-accent/50',
                        )}
                      >
                        <Icon className="size-5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
            {canManage && (
              <Link
                href="/team/invite"
                aria-current={pathname === '/team/invite' ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  pathname === '/team/invite'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/10 dark:hover:bg-sidebar-accent/50',
                )}
              >
                <UserCog className="size-5 shrink-0" />
                <span className="truncate">Invite</span>
              </Link>
            )}
          </div>
          <div className="shrink-0 border-t border-sidebar-border bg-sidebar px-4 py-3">
            <div className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.avatar ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
                <p className="truncate text-xs text-sidebar-foreground/55">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={pendingSignOut}
              onClick={() => startSignOut(() => signOut())}
              aria-busy={pendingSignOut || undefined}
              className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <LogOut className="size-5 shrink-0" />
              <span>{pendingSignOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
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
