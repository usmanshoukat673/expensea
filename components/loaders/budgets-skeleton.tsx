import { CardSkeleton } from '@/components/loaders/card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function BudgetsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 max-w-md w-full" />
      <div className="hidden md:block space-y-2">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="grid md:hidden grid-cols-1 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
