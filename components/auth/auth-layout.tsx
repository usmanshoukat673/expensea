'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-background via-muted/30 to-accent/10 border-r border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground font-bold">
                EX
              </div>
              <span className="font-semibold text-lg">Expensea</span>
            </Link>
            <ThemeToggle />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 max-w-md"
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Smarter Expense Tracking for Teams
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Built for teams who manage shared spending. Real-time balances, role-based access, and shareable reports.
            </p>
            <div className="flex gap-8 pt-4">
              <div>
                <p className="text-2xl font-bold text-accent">2.4k+</p>
                <p className="text-sm text-muted-foreground">Transactions logged</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">98%</p>
                <p className="text-sm text-muted-foreground">Settlement rate</p>
              </div>
            </div>
            <blockquote className="border-l-2 border-accent pl-4 text-sm text-muted-foreground italic">
              &ldquo;Finally replaced our spreadsheet. The team dashboard is exactly what we needed.&rdquo;
              <footer className="mt-2 not-italic font-medium text-foreground">— Product team, Pakistan</footer>
            </blockquote>
          </motion.div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Expensea</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-background p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="lg:hidden flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
                EX
              </div>
              <span className="font-semibold">Expensea</span>
            </Link>
            <ThemeToggle />
          </div>
          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-xl border border-border/60 bg-card/40 p-5 shadow-xl backdrop-blur-xl sm:p-8"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
