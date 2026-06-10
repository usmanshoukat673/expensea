import { BrandLogo } from '@/components/branding/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamInviteLoading() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <BrandLogo href="/" size="sm" />
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center py-8 sm:py-10 lg:py-12">
          <div className="grid w-full items-stretch gap-6 lg:grid-cols-2 xl:gap-8">
            <section className="rounded-xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur sm:p-7">
              <div className="space-y-6">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full max-w-lg" />
                  <Skeleton className="h-10 w-4/5 max-w-md" />
                  <Skeleton className="h-5 w-full max-w-xl" />
                  <Skeleton className="h-5 w-3/4 max-w-lg" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex gap-3 rounded-xl border border-border/70 bg-card/70 p-4">
                      <Skeleton className="size-9 shrink-0 rounded-lg" />
                      <div className="w-full space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/70 bg-card/80 p-5 shadow-xl backdrop-blur sm:p-7">
              <div className="space-y-2 border-b border-border/70 pb-5">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
              <div className="space-y-5 pt-6">
                <div className="flex gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                  <Skeleton className="size-16 shrink-0 rounded-xl" />
                  <div className="w-full space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-10 w-full" />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
