import { PageHeaderSkeleton } from '@/components/loaders/page-skeleton';
import { FormSkeleton } from '@/components/loaders/page-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function SettingsSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <PageHeaderSkeleton />
        <div className="flex gap-4 mt-4 border-b border-border pb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <FormSkeleton fields={4} />
        <Skeleton className="hidden h-48 rounded-xl lg:block" />
      </div>
    </div>
  );
}
