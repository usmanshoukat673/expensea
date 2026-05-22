import { Skeleton } from '@/components/ui/skeleton';

export function PageHeaderSkeleton({ subtitle }: { subtitle?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-48" />
      {subtitle && <Skeleton className="h-4 w-72" />}
    </div>
  );
}

export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
