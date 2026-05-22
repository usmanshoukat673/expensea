import { PageHeaderSkeleton } from '@/components/loaders/page-skeleton';
import { StatsCardsSkeleton } from '@/components/loaders/card-skeleton';
import { ChartSkeleton } from '@/components/loaders/chart-skeleton';

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton subtitle />
      <StatsCardsSkeleton count={3} />
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartSkeleton height={300} />
        <ChartSkeleton height={300} />
      </div>
    </div>
  );
}
