'use client';

import Link from 'next/link';
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
    <div className="min-h-screen bg-background transition-colors">
      <header className="border-b border-border/60 bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
              EX
            </div>
            <span className="font-semibold text-sm">Expensea</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <p className="text-sm text-accent font-medium">Expense Summary</p>
          <h1 className="text-3xl font-bold mt-1">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <CurrencyProvider initialCode={normalizeCurrencyCode(currencyCode)} canEdit={false}>
          {children}
        </CurrencyProvider>
      </main>
      <footer className="max-w-4xl mx-auto px-6 py-8 border-t border-border text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Expensea — Smarter Expense Tracking
      </footer>
    </div>
  );
}
