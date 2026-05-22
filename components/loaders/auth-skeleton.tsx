import { Skeleton } from '@/components/ui/skeleton';

export function AuthSkeleton() {
  return (
    <div className="w-full max-w-md space-y-6 mx-auto">
      <div className="space-y-2 text-center">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
