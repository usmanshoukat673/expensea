import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { AppProviders } from '@/components/providers/app-providers';
import { ThemeScript } from '@/components/theme-script';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: {
    default: 'Expensea — Smarter Expense Tracking',
    template: '%s | Expensea',
  },
  description: 'Modern SaaS platform for tracking and managing shared team expenses',
  keywords: ['expenses', 'team tracking', 'expense manager', 'SaaS finance tool'],
  openGraph: {
    title: 'Expensea — Smarter Expense Tracking',
    description: 'Modern SaaS platform for tracking and managing shared team expenses',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} min-h-full font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
