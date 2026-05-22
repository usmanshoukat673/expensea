'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const id = window.setTimeout(() => setActive(false), 400);
    return () => window.clearTimeout(id);
  }, [pathname, searchParams]);

  return (
    <div
      className={cn(
        'pointer-events-none fixed top-0 left-0 right-0 z-[100] h-0.5 bg-accent origin-left transition-transform duration-300 ease-out md:left-64',
        active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
      )}
      aria-hidden
    />
  );
}
