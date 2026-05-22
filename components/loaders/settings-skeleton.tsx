import { PageHeaderSkeleton } from '@/components/loaders/page-skeleton';
import { FormSkeleton } from '@/components/loaders/page-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function SettingsSkeleton() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <PageHeaderSkeleton />
        <div className="flex gap-4 mt-4 border-b border-border pb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
      </div>
      <FormSkeleton fields={4} />
    </div>
  );
}
