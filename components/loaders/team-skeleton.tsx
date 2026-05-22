import { PageHeaderSkeleton } from '@/components/loaders/page-skeleton';
import { TableSkeleton } from '@/components/loaders/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function TeamSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <PageHeaderSkeleton subtitle />
        <Skeleton className="h-10 w-32" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
