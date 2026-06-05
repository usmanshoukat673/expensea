'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, BookOpen, Users, BarChart3, Settings, Bell, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/branding/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeamSwitcher } from '@/components/team/team-switcher';
import type { AppLayoutUser } from '@/components/app-layout';
import type { TeamRole } from '@/lib/database.types';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/entries', icon: BookOpen, label: 'Entries' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/activity', icon: Activity, label: 'Activity' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings/profile', icon: Settings, label: 'Settings' },
];

export function Navbar({
  user,
  teamName,
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
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-sidebar-border bg-sidebar md:hidden">
      <div className="flex items-center justify-between h-full px-4 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
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
                  isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
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
