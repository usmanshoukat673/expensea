import { PageHeaderSkeleton } from '@/components/loaders/page-skeleton';
import { TableSkeleton } from '@/components/loaders/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function EntriesPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton subtitle />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 max-w-md" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
