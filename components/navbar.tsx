'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, BookOpen, Users, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { AppLayoutUser } from '@/components/app-layout';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/entries', icon: BookOpen, label: 'Entries' },
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings/profile', icon: Settings, label: 'Settings' },
];

export function Navbar({ user, teamName }: { user: AppLayoutUser; teamName: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50">
      <div className="flex items-center justify-between h-full px-4 gap-2">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm shrink-0">
            EX
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground block truncate">{teamName}</span>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-sidebar-accent rounded-lg"
            aria-label="Menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {isOpen && (
        <nav className="absolute top-16 left-0 right-0 bg-sidebar border-b border-sidebar-border px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium',
                  isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
