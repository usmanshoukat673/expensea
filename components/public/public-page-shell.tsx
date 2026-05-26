'use client';

import { BrandLogo } from '@/components/branding/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { CurrencyProvider } from '@/components/providers/currency-provider';
import { normalizeCurrencyCode } from '@/lib/currency';

export function PublicPageShell({
  children,
  title,
  subtitle,
  currencyCode,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  currencyCode?: string | null;
}) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background transition-colors">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo href="/" size="sm" />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <div className="min-w-0">
          <p className="text-sm text-accent font-medium">Expense Summary</p>
          <h1 className="text-3xl font-bold mt-1">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <CurrencyProvider initialCode={normalizeCurrencyCode(currencyCode)} canEdit={false}>
          {children}
        </CurrencyProvider>
      </main>
      <footer className="mx-auto max-w-4xl border-t border-border px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Expensea — Smarter Expense Tracking
      </footer>
    </div>
  );
}
