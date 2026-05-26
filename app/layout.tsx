import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { AppProviders } from '@/components/providers/app-providers';
import { ThemeScript } from '@/components/theme-script';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://expensea.app'),
  title: {
    default: 'Expensea — Smarter Expense Tracking',
    template: '%s | Expensea',
  },
  description: 'Modern SaaS platform for tracking and managing shared team expenses',
  keywords: ['expenses', 'team tracking', 'expense manager', 'SaaS finance tool'],
  icons: {
    icon: [{ url: '/icons/favicon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icons/favicon.svg'],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Expensea — Smarter Expense Tracking',
    description: 'Modern SaaS platform for tracking and managing shared team expenses',
    type: 'website',
    siteName: 'Expensea',
    images: [
      {
        url: '/branding/expensea-og.png',
        width: 1200,
        height: 630,
        alt: 'Expensea — Smarter Expense Tracking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Expensea — Smarter Expense Tracking',
    description: 'Modern SaaS platform for tracking and managing shared team expenses',
    images: ['/branding/expensea-og.png'],
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
