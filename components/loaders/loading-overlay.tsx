'use client';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export function LoadingOverlay({
  show,
  className,
}: {
  show?: boolean;
  className?: string;
}) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[2px]',
        className
      )}
      aria-hidden={!show}
    >
      <Spinner className="h-6 w-6" />
    </div>
  );
}
