'use client';

import { Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FloatingActionButton({ canEdit }: { canEdit: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  if (!canEdit) return null;

  const onEntriesPage = pathname === '/entries' || pathname.startsWith('/entries/');

  return (
    <Button
      size="icon-lg"
      className={cn(
        'md:hidden fixed right-4 bottom-20 z-40 rounded-full shadow-lg glow h-14 w-14',
        'transition-transform hover:scale-105'
      )}
      onClick={() => {
        if (onEntriesPage) {
          window.dispatchEvent(new CustomEvent('open-lunch-modal'));
        } else {
          router.push('/entries?add=1');
        }
      }}
      aria-label="Add expense"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}
