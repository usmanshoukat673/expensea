import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export function AppLoader({ className, label = 'Loading...' }: { className?: string; label?: string }) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
