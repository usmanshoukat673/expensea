'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Users, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/entries', icon: BookOpen, label: 'Entries' },
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/analytics', icon: BarChart3, label: 'Stats' },
  { href: '/settings/profile', icon: Settings, label: 'Settings' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-sidebar/95 backdrop-blur-md pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium min-w-[56px]',
                active ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
